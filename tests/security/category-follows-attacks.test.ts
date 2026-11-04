// FEED-006: seguir categorías por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra que la tabla
// category_follows no es de ningún cliente, que anon no puede usar las RPC, que el slug distingue
// mayúsculas, que seguir una categoría no abre cuentas privadas ni bloqueadas y que nadie ve las
// categorías de otra cuenta. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-catfollow-test-only";

type Account = { id: string; token: string; username: string };
async function account(label: string, isPrivate = false): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@catfollow.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `cf${id.replaceAll("-", "").slice(0, 14)}`;
  const inserted = await admin
    .from("profiles")
    .insert({ user_id: id, username, is_private: isPrivate });
  if (inserted.error) throw inserted.error;
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (session.error) throw session.error;
  return { id, username, token: session.data.session!.access_token };
}

async function rpc(fn: string, body: object, token?: string) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text, data: text ? JSON.parse(text) : null };
}

async function table(method: string, token: string | undefined, body?: object) {
  const res = await fetch(`${URL_}/rest/v1/category_follows`, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, text: await res.text() };
}

async function newPoll(user: Account, question: string, category: string) {
  const created = await admin
    .from("polls")
    .insert({ user_id: user.id, question, category_slug: category })
    .select("id")
    .single();
  if (created.error) throw created.error;
  const options = await admin.from("poll_options").insert([
    { poll_id: created.data.id, text: "Sí", position: 1 },
    { poll_id: created.data.id, text: "No", position: 2 },
  ]);
  if (options.error) throw options.error;
  return created.data.id as string;
}

let follower: Account, author: Account, other: Account, priv: Account, blocked: Account;
let sport: string, tech: string, secret: string, blockedPoll: string;

const feed = async (token: string, category?: string) =>
  (await rpc("get_feed", { p_mode: "siguiendo", p_category: category ?? null }, token)).data.map(
    (r: { poll_id: string }) => r.poll_id,
  ) as string[];

beforeAll(async () => {
  [follower, author, other, priv, blocked] = await Promise.all([
    account("sigue"),
    account("autora"),
    account("tercera"),
    account("privada", true),
    account("bloqueada"),
  ]);
  sport = await newPoll(author, "¿Encuesta de deportes de la autora?", "deportes");
  tech = await newPoll(author, "¿Encuesta de tecnología de la autora?", "tecnologia");
  secret = await newPoll(priv, "¿Encuesta de deportes de una privada?", "deportes");
  blockedPoll = await newPoll(blocked, "¿Encuesta de deportes de una bloqueada?", "deportes");
  const block = await admin
    .from("user_blocks")
    .insert({ blocker_id: follower.id, blocked_id: blocked.id });
  if (block.error) throw block.error;
}, 90_000);

describe("la tabla category_follows no es de ningún cliente", () => {
  it("anon y authenticated no leen, insertan ni borran", async () => {
    for (const token of [undefined, follower.token]) {
      for (const method of ["GET", "DELETE"]) {
        const r = await table(method, token);
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.status).toBeLessThan(500);
      }
      const ins = await table("POST", token, { user_id: follower.id, category_slug: "deportes" });
      expect(ins.status).toBeGreaterThanOrEqual(400);
      expect(ins.status).toBeLessThan(500);
    }
    const check = await admin.from("category_follows").select("*").eq("user_id", follower.id);
    expect(check.data).toEqual([]);
  });
});

describe("las RPC exigen sesión y validan", () => {
  it("anon no puede ejecutar follow_category, unfollow_category ni list_my_categories", async () => {
    for (const [fn, body] of [
      ["follow_category", { p_slug: "deportes" }],
      ["unfollow_category", { p_slug: "deportes" }],
      ["list_my_categories", {}],
    ] as const) {
      const r = await rpc(fn, body);
      expect([401, 403]).toContain(r.status);
    }
  });

  it("el slug distingue mayúsculas y rechaza inexistentes; argumentos manipulados dan 404", async () => {
    for (const slug of ["Deportes", "no-existe", "", " deportes"]) {
      const r = await rpc("follow_category", { p_slug: slug }, follower.token);
      expect(r.status).toBe(400);
      expect(r.data.message).toBe("INVALID_CATEGORY");
    }
    const forged = await rpc(
      "follow_category",
      { p_slug: "deportes", p_user_id: other.id },
      follower.token,
    );
    expect(forged.status).toBe(404);
  });
});

describe("seguir una categoría cambia sólo el feed de quien la sigue", () => {
  it("antes vacío; después las publicadas visibles de la categoría, sin privadas ni bloqueadas", async () => {
    expect(await feed(follower.token)).toEqual([]);

    const done = await rpc("follow_category", { p_slug: "deportes" }, follower.token);
    expect(done.status).toBe(204);
    const again = await rpc("follow_category", { p_slug: "deportes" }, follower.token);
    expect(again.status).toBe(204);

    const ids = await feed(follower.token);
    expect(ids).toContain(sport);
    expect(ids).not.toContain(tech);
    expect(ids).not.toContain(secret);
    expect(ids).not.toContain(blockedPoll);
    expect(new Set(ids).size).toBe(ids.length);
    // El filtro de categoría estrecha el resultado.
    expect(await feed(follower.token, "tecnologia")).toEqual([]);
    // Otra cuenta que no la sigue no ve nada nuevo.
    expect(await feed(other.token)).toEqual([]);
  });

  it("seguir también a la autora no duplica y suma sus demás categorías", async () => {
    const f = await admin
      .from("follows")
      .insert({ follower_id: follower.id, followee_id: author.id, status: "accepted" });
    if (f.error) throw f.error;
    const ids = await feed(follower.token);
    expect(ids.filter((id) => id === sport)).toHaveLength(1);
    expect(ids).toContain(tech);
  });

  it("la lista es propia y no revela nada a otras cuentas", async () => {
    const mine = await rpc("list_my_categories", {}, follower.token);
    expect(mine.status).toBe(200);
    expect(mine.data).toEqual([{ slug: "deportes", name: "Deportes" }]);
    expect(mine.text).not.toContain(follower.id);
    for (const who of [author, other]) {
      const theirs = await rpc("list_my_categories", {}, who.token);
      expect(theirs.data).toEqual([]);
    }
    // Otra cuenta no puede dejar de seguir por ella.
    const foreign = await rpc("unfollow_category", { p_slug: "deportes" }, other.token);
    expect(foreign.status).toBe(204);
    expect((await rpc("list_my_categories", {}, follower.token)).data).toHaveLength(1);
  });

  it("dejar de seguir lo devuelve todo; repetir o una inexistente no falla", async () => {
    const undo = await rpc("unfollow_category", { p_slug: "deportes" }, follower.token);
    expect(undo.status).toBe(204);
    expect((await rpc("unfollow_category", { p_slug: "deportes" }, follower.token)).status).toBe(
      204,
    );
    expect((await rpc("unfollow_category", { p_slug: "no-existe" }, follower.token)).status).toBe(
      204,
    );
    expect((await rpc("list_my_categories", {}, follower.token)).data).toEqual([]);
    const ids = await feed(follower.token);
    expect(ids).toContain(sport); // sigue por la relación con la autora
    expect(ids).not.toContain(secret);
  });
});

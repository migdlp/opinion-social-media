// FEED-003: «No me interesa» por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra que la tabla
// dismissed_polls no es de ningún cliente, que anon no puede usar las RPC, que descartar una privada
// sin permiso, una oculta o una inexistente es indistinguible, que el descarte sólo cambia el feed de
// quien descarta y que nadie lee los descartes de otra cuenta. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-dismiss-test-only";

type Account = { id: string; token: string; username: string };
async function account(label: string, isPrivate = false): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@dismiss.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `di${id.replaceAll("-", "").slice(0, 14)}`;
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
  const res = await fetch(`${URL_}/rest/v1/dismissed_polls`, {
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

async function newPoll(user: Account, question: string, extra: Record<string, unknown> = {}) {
  const created = await admin
    .from("polls")
    .insert({ user_id: user.id, question, ...extra })
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

let dismisser: Account, author: Account, other: Account, priv: Account;
let visible: string, own: string, hidden: string, secret: string;

const feed = async (token: string) =>
  (await rpc("get_feed", { p_mode: "siguiendo" }, token)).data.map(
    (r: { poll_id: string }) => r.poll_id,
  ) as string[];

beforeAll(async () => {
  [dismisser, author, other, priv] = await Promise.all([
    account("descarta"),
    account("autora"),
    account("tercera"),
    account("privada", true),
  ]);
  visible = await newPoll(author, "¿Encuesta que se descarta?");
  own = await newPoll(dismisser, "¿Encuesta propia?");
  hidden = await newPoll(author, "¿Encuesta oculta?", { status: "hidden" });
  secret = await newPoll(priv, "¿Encuesta de cuenta privada?");
  // La descartadora y la tercera siguen a la autora: Siguiendo es determinista.
  const follows = await admin.from("follows").insert([
    { follower_id: dismisser.id, followee_id: author.id, status: "accepted" },
    { follower_id: other.id, followee_id: author.id, status: "accepted" },
  ]);
  if (follows.error) throw follows.error;
}, 90_000);

describe("la tabla dismissed_polls no es de ningún cliente", () => {
  it("anon y authenticated no leen, insertan ni borran", async () => {
    for (const token of [undefined, dismisser.token]) {
      for (const method of ["GET", "DELETE"]) {
        const r = await table(method, token);
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.status).toBeLessThan(500);
      }
      const ins = await table("POST", token, { user_id: dismisser.id, poll_id: visible });
      expect(ins.status).toBeGreaterThanOrEqual(400);
      expect(ins.status).toBeLessThan(500);
    }
    const check = await admin.from("dismissed_polls").select("*").eq("user_id", dismisser.id);
    expect(check.data).toEqual([]);
  });
});

describe("las RPC exigen sesión y validan", () => {
  it("anon no puede ejecutar dismiss_poll, undismiss_poll ni list_dismissed_polls", async () => {
    for (const [fn, body] of [
      ["dismiss_poll", { p_poll_id: visible }],
      ["undismiss_poll", { p_poll_id: visible }],
      ["list_dismissed_polls", {}],
    ] as const) {
      const r = await rpc(fn, body);
      expect([401, 403]).toContain(r.status);
    }
  });

  it("propia → CANNOT_DISMISS_OWN; oculta, privada ajena e inexistente son indistinguibles", async () => {
    const mine = await rpc("dismiss_poll", { p_poll_id: own }, dismisser.token);
    expect(mine.status).toBe(400);
    expect(mine.data.message).toBe("CANNOT_DISMISS_OWN");
    const ghost = "00000000-0000-4000-8000-000000000000";
    const results = await Promise.all(
      [hidden, secret, ghost].map((id) => rpc("dismiss_poll", { p_poll_id: id }, dismisser.token)),
    );
    for (const r of results) {
      expect(r.status).toBe(400);
      expect(r.data.message).toBe("POLL_UNAVAILABLE");
    }
    expect(new Set(results.map((r) => r.text)).size).toBe(1);
  });

  it("entradas malformadas y firmas manipuladas se rechazan sin 500", async () => {
    for (const bad of ["no-uuid", 123, null]) {
      const r = await rpc("dismiss_poll", { p_poll_id: bad }, dismisser.token);
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    }
    // No existe una firma con el id de quien descarta: no se puede descartar «en nombre de» otra.
    const forged = await rpc(
      "dismiss_poll",
      { p_poll_id: visible, p_user_id: other.id },
      dismisser.token,
    );
    expect(forged.status).toBe(404);
    const badCursor = await rpc("list_dismissed_polls", { p_cursor: "basura" }, dismisser.token);
    expect(badCursor.status).toBe(400);
    expect(badCursor.data.message).toBe("INVALID_CURSOR");
  });
});

describe("el descarte sólo cambia el feed de quien descarta", () => {
  it("antes: ambas ven la encuesta; después: sólo la tercera", async () => {
    expect(await feed(dismisser.token)).toContain(visible);
    expect(await feed(other.token)).toContain(visible);

    const done = await rpc("dismiss_poll", { p_poll_id: visible }, dismisser.token);
    expect(done.status).toBe(204);
    const again = await rpc("dismiss_poll", { p_poll_id: visible }, dismisser.token);
    expect(again.status).toBe(204);

    expect(await feed(dismisser.token)).not.toContain(visible);
    expect(await feed(other.token)).toContain(visible);
    expect(await feed(author.token)).not.toContain(own);
  });

  it("no afecta al enlace directo, a la tarjeta, al perfil ni a los votos", async () => {
    const direct = await admin.from("polls").select("id").eq("id", visible);
    expect(direct.data).toHaveLength(1);
    const cards = await rpc("get_poll_cards", { p_poll_ids: [visible] }, dismisser.token);
    expect(cards.data).toHaveLength(1);
    const polls = await rpc("get_profile_polls", { p_username: author.username }, dismisser.token);
    expect(polls.data.map((r: { poll_id: string }) => r.poll_id)).toContain(visible);
    const options = await admin.from("poll_options").select("id").eq("poll_id", visible).limit(1);
    const vote = await rpc(
      "vote_poll",
      { p_poll_id: visible, p_option_id: options.data![0].id },
      dismisser.token,
    );
    expect(vote.status).toBe(200);
  });

  it("la lista es propia: nadie más ve el descarte y no expone user_id", async () => {
    const mine = await rpc("list_dismissed_polls", {}, dismisser.token);
    expect(mine.status).toBe(200);
    expect(mine.data).toHaveLength(1);
    expect(Object.keys(mine.data[0]).sort()).toEqual(["cursor", "dismissed_at", "poll_id"]);
    expect(mine.data[0].poll_id).toBe(visible);
    expect(mine.text).not.toContain(dismisser.id);
    for (const who of [author, other]) {
      const theirs = await rpc("list_dismissed_polls", {}, who.token);
      expect(theirs.data).toEqual([]);
    }
  });

  it("otra cuenta no puede recuperar el descarte ajeno; la propia sí, y repetir no falla", async () => {
    const foreign = await rpc("undismiss_poll", { p_poll_id: visible }, other.token);
    expect(foreign.status).toBe(204);
    expect(await feed(dismisser.token)).not.toContain(visible);

    const undo = await rpc("undismiss_poll", { p_poll_id: visible }, dismisser.token);
    expect(undo.status).toBe(204);
    const repeat = await rpc("undismiss_poll", { p_poll_id: visible }, dismisser.token);
    expect(repeat.status).toBe(204);
    expect(await feed(dismisser.token)).toContain(visible);
  });
});

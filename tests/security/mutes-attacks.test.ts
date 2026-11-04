// SOCIAL-003 (D-050): silenciar cuentas por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra que
// la tabla user_mutes no es de ningún cliente, que anon no puede usar las RPC, que silenciar sólo
// cambia el feed de quien silencia, que la cuenta silenciada no recibe ninguna señal y que un
// bloqueo o un id manipulado no abren nada. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-mutes-test-only";

type Account = { id: string; token: string; username: string };
async function account(label: string): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@mutes.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `mu${id.replaceAll("-", "").slice(0, 14)}`;
  const inserted = await admin.from("profiles").insert({ user_id: id, username });
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
  const res = await fetch(`${URL_}/rest/v1/user_mutes`, {
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

let muter: Account, target: Account, other: Account, stranger: Account, blocker: Account;
let targetPoll: string;

const feed = async (token: string) =>
  (await rpc("get_feed", { p_mode: "siguiendo" }, token)).data.map(
    (r: { poll_id: string }) => r.poll_id,
  ) as string[];

beforeAll(async () => {
  [muter, target, other, stranger, blocker] = await Promise.all([
    account("silenciadora"),
    account("silenciada"),
    account("tercera"),
    account("extrana"),
    account("bloqueadora"),
  ]);
  const poll = await admin
    .from("polls")
    .insert({ user_id: target.id, question: "¿Encuesta de la cuenta silenciada?" })
    .select("id")
    .single();
  if (poll.error) throw poll.error;
  targetPoll = poll.data.id;
  const options = await admin.from("poll_options").insert([
    { poll_id: targetPoll, text: "Sí", position: 1 },
    { poll_id: targetPoll, text: "No", position: 2 },
  ]);
  if (options.error) throw options.error;
  // La silenciadora y la tercera siguen a la cuenta silenciada: Siguiendo es determinista.
  const follows = await admin.from("follows").insert([
    { follower_id: muter.id, followee_id: target.id, status: "accepted" },
    { follower_id: other.id, followee_id: target.id, status: "accepted" },
  ]);
  if (follows.error) throw follows.error;
  const block = await admin
    .from("user_blocks")
    .insert({ blocker_id: blocker.id, blocked_id: stranger.id });
  if (block.error) throw block.error;
}, 90_000);

describe("la tabla user_mutes no es de ningún cliente", () => {
  it("anon y authenticated no leen, insertan ni borran", async () => {
    for (const token of [undefined, muter.token]) {
      for (const method of ["GET", "DELETE"]) {
        const r = await table(method, token);
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.status).toBeLessThan(500);
        expect(r.text).not.toContain(target.id);
      }
      const ins = await table("POST", token, { muter_id: muter.id, muted_id: other.id });
      expect(ins.status).toBeGreaterThanOrEqual(400);
      expect(ins.status).toBeLessThan(500);
    }
    const check = await admin.from("user_mutes").select("*").eq("muter_id", muter.id);
    expect(check.data).toEqual([]);
  });
});

describe("las RPC exigen sesión y validan", () => {
  it("anon no puede ejecutar mute_user, unmute_user ni list_muted_users", async () => {
    for (const [fn, body] of [
      ["mute_user", { p_username: target.username }],
      ["unmute_user", { p_username: target.username }],
      ["list_muted_users", {}],
    ] as const) {
      const r = await rpc(fn, body);
      expect([401, 403]).toContain(r.status);
    }
  });

  it("autosilencio, inexistente y argumentos manipulados", async () => {
    const self = await rpc("mute_user", { p_username: muter.username }, muter.token);
    expect(self.status).toBe(400);
    expect(self.data.message).toBe("CANNOT_MUTE_SELF");
    const ghost = await rpc("mute_user", { p_username: "no_existe_xyz" }, muter.token);
    expect(ghost.data.message).toBe("USER_NOT_FOUND");
    // No existe una firma con el id de quien silencia: no se puede silenciar «en nombre de» otra.
    const forged = await rpc(
      "mute_user",
      { p_username: target.username, p_muter_id: other.id },
      muter.token,
    );
    expect(forged.status).toBe(404);
  });

  it("un bloqueo en cualquier sentido es indistinguible de una cuenta inexistente", async () => {
    const byBlocker = await rpc("mute_user", { p_username: stranger.username }, blocker.token);
    const byBlocked = await rpc("mute_user", { p_username: blocker.username }, stranger.token);
    for (const r of [byBlocker, byBlocked]) {
      expect(r.status).toBe(400);
      expect(r.data.message).toBe("USER_NOT_FOUND");
    }
  });
});

describe("silenciar sólo cambia el feed de quien silencia", () => {
  it("antes: ambas ven la encuesta; después: sólo la tercera", async () => {
    expect(await feed(muter.token)).toContain(targetPoll);
    expect(await feed(other.token)).toContain(targetPoll);

    const done = await rpc("mute_user", { p_username: target.username }, muter.token);
    expect(done.status).toBe(204);
    const again = await rpc(
      "mute_user",
      { p_username: target.username.toUpperCase() },
      muter.token,
    );
    expect(again.status).toBe(204);

    expect(await feed(muter.token)).not.toContain(targetPoll);
    expect(await feed(other.token)).toContain(targetPoll);
  });

  it("no afecta al enlace directo, al perfil ni al seguimiento", async () => {
    const direct = await admin.from("polls").select("id").eq("id", targetPoll);
    expect(direct.data).toHaveLength(1);
    const profile = await rpc("get_profile", { p_username: target.username }, muter.token);
    expect(profile.status).toBe(200);
    expect(profile.data[0].is_muted).toBe(true);
    expect(profile.data[0].viewer_relation).toBe("following");
    const polls = await rpc("get_profile_polls", { p_username: target.username }, muter.token);
    expect(polls.data.map((r: { poll_id: string }) => r.poll_id)).toContain(targetPoll);
  });

  it("la cuenta silenciada y terceros no reciben ninguna señal", async () => {
    // El perfil de quien silenció, visto por la silenciada, por otra cuenta y por un visitante.
    for (const token of [target.token, other.token, undefined]) {
      const p = await rpc("get_profile", { p_username: muter.username }, token);
      expect(p.status).toBe(200);
      expect(p.data[0].is_muted).toBe(false);
    }
    const toOther = await rpc("get_profile", { p_username: target.username }, other.token);
    expect(toOther.data[0].is_muted).toBe(false);
    const anon = await rpc("get_profile", { p_username: target.username });
    expect(anon.data[0].is_muted).toBe(false);
    // Su lista de silenciadas está vacía y no revela quién la silenció.
    const list = await rpc("list_muted_users", {}, target.token);
    expect(list.status).toBe(200);
    expect(list.data).toEqual([]);
    expect(list.text).not.toContain(muter.username);
  });

  it("la lista propia sólo trae @usuario, nombre y cursor, y unmute lo devuelve todo", async () => {
    const list = await rpc("list_muted_users", {}, muter.token);
    expect(list.data).toHaveLength(1);
    expect(Object.keys(list.data[0]).sort()).toEqual(["cursor", "display_name", "username"]);
    expect(list.data[0].username).toBe(target.username);
    expect(list.text).not.toContain(target.id);

    // Otra cuenta no puede quitar el silencio ajeno.
    const foreign = await rpc("unmute_user", { p_username: target.username }, other.token);
    expect(foreign.status).toBe(204);
    expect(await feed(muter.token)).not.toContain(targetPoll);

    const undo = await rpc("unmute_user", { p_username: target.username }, muter.token);
    expect(undo.status).toBe(204);
    const repeat = await rpc("unmute_user", { p_username: target.username }, muter.token);
    expect(repeat.status).toBe(204);
    expect(await feed(muter.token)).toContain(targetPoll);
  });
});

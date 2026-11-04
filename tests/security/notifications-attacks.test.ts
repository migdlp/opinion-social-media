// NOTIF-001: avisos de seguimiento por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra que anon
// no ejecuta las RPC, que cada cuenta sólo ve sus propios avisos, que no se filtra user_id, que
// bloqueos y silencios los ocultan, que el cursor manipulado se rechaza, que la marca de lectura no
// se puede escribir desde un cliente y que los argumentos de más no suplantan a otra cuenta.
// Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-notif-test-only";

type Account = { id: string; token: string; username: string };
async function account(label: string, isPrivate = false): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@notif.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `nt${id.replaceAll("-", "").slice(0, 14)}`;
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

type Row = { kind: string; actor_username: string; is_unread: boolean; cursor: string };
const list = async (a: Account, cursor?: string) => {
  const r = await rpc("list_notifications", { p_cursor: cursor ?? null }, a.token);
  expect(r.status).toBe(200);
  return r.data as Row[];
};

let target: Account, fan: Account, priv: Account, asker: Account, nosy: Account, loud: Account;
let blocked: Account, muted: Account;

beforeAll(async () => {
  [target, fan, priv, asker, nosy, loud, blocked, muted] = await Promise.all([
    account("destino"),
    account("fan"),
    account("privada", true),
    account("pide"),
    account("curiosa"),
    account("ruidosa"),
    account("bloqueada"),
    account("silenciada"),
  ]);
  expect((await rpc("follow_user", { p_username: target.username }, fan.token)).status).toBe(200);
  expect((await rpc("follow_user", { p_username: priv.username }, asker.token)).status).toBe(200);
  expect((await rpc("follow_user", { p_username: target.username }, blocked.token)).status).toBe(
    200,
  );
  expect((await rpc("follow_user", { p_username: target.username }, muted.token)).status).toBe(200);
}, 90_000);

describe("las RPC exigen sesión", () => {
  it("anon no puede ejecutar list_notifications, count_unread_notifications ni mark_notifications_seen", async () => {
    for (const [fn, body] of [
      ["list_notifications", {}],
      ["count_unread_notifications", {}],
      ["mark_notifications_seen", {}],
    ] as const) {
      const r = await rpc(fn, body);
      expect([401, 403]).toContain(r.status);
    }
  });

  it("argumentos manipulados (un user_id ajeno, un tipo) no se aceptan: 404", async () => {
    for (const [fn, body] of [
      ["list_notifications", { p_user_id: target.id }],
      ["count_unread_notifications", { p_user_id: target.id }],
      ["mark_notifications_seen", { p_user_id: target.id }],
    ] as const) {
      const r = await rpc(fn, body, nosy.token);
      expect(r.status).toBe(404);
    }
  });
});

describe("cada cuenta sólo ve sus propios avisos", () => {
  it("el destino ve a sus seguidores; una tercera no ve nada", async () => {
    const mine = await list(target);
    expect(mine.map((r) => r.actor_username).sort()).toEqual(
      [fan.username, blocked.username, muted.username].sort(),
    );
    expect(mine.every((r) => r.kind === "new_follower" && r.is_unread)).toBe(true);
    expect(await list(nosy)).toEqual([]);
    expect((await rpc("count_unread_notifications", {}, nosy.token)).data).toBe(0);
    expect((await rpc("count_unread_notifications", {}, target.token)).data).toBe(3);
  });

  it("la solicitud a una cuenta privada sólo la ve la privada, y sin user_id", async () => {
    const theirs = await rpc("list_notifications", {}, priv.token);
    expect(theirs.data).toHaveLength(1);
    expect(theirs.data[0].kind).toBe("follow_request");
    expect(theirs.data[0].actor_username).toBe(asker.username);
    expect(theirs.text).not.toMatch(/user_id|follower_id|followee_id/);
    expect(await list(asker)).toEqual([]);
    expect(await list(target)).not.toContainEqual(
      expect.objectContaining({ kind: "follow_request" }),
    );
  });
});

describe("bloqueos y silencios", () => {
  it("quien bloqueo o silencio desaparece de mis avisos", async () => {
    expect((await rpc("block_user", { p_username: blocked.username }, target.token)).status).toBe(
      204,
    );
    expect((await rpc("mute_user", { p_username: muted.username }, target.token)).status).toBe(204);
    const mine = await list(target);
    expect(mine.map((r) => r.actor_username)).toEqual([fan.username]);
    expect((await rpc("count_unread_notifications", {}, target.token)).data).toBe(1);
  });
});

describe("marca de lectura y cursor", () => {
  it("sólo mark_notifications_seen escribe la marca; un cliente no puede tocarla", async () => {
    const patch = await fetch(`${URL_}/rest/v1/profiles?user_id=eq.${target.id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${target.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notifications_seen_at: "2000-01-01T00:00:00Z" }),
    });
    expect(patch.status).toBeGreaterThanOrEqual(400);
    const read = await fetch(`${URL_}/rest/v1/profiles?select=notifications_seen_at`, {
      headers: { apikey: key, Authorization: `Bearer ${target.token}` },
    });
    expect(read.status).toBeGreaterThanOrEqual(400);

    expect((await rpc("mark_notifications_seen", {}, target.token)).status).toBe(204);
    expect((await rpc("count_unread_notifications", {}, target.token)).data).toBe(0);
    expect((await list(target)).every((r) => !r.is_unread)).toBe(true);
    // Marcar como vista no afecta a otra cuenta.
    expect((await rpc("count_unread_notifications", {}, priv.token)).data).toBe(1);
  });

  it("un cursor manipulado da INVALID_CURSOR, nunca error del servidor ni datos ajenos", async () => {
    for (const cursor of [
      "basura",
      "x|new_follower|y",
      "2026-01-01T00:00:00Z|kind_raro|y",
      "2026-01-01T00:00:00Z|new_follower|",
      "'; drop table follows; --|new_follower|y",
    ]) {
      const r = await rpc("list_notifications", { p_cursor: cursor }, nosy.token);
      expect(r.status).toBe(400);
      expect(r.data.message).toBe("INVALID_CURSOR");
    }
    // Un cursor válido de otra cuenta no revela filas ajenas: sólo filtra mi propia lista.
    const foreign = (await list(priv))[0].cursor;
    expect(await list(nosy, foreign)).toEqual([]);
  });
});

describe("aceptación", () => {
  it("aceptar retira la solicitud y la que pidió recibe el aviso follow_accepted", async () => {
    expect(
      (
        await rpc(
          "respond_follow_request",
          { p_username: asker.username, p_accept: true },
          priv.token,
        )
      ).status,
    ).toBe(204);
    expect(await list(priv)).toEqual([]);
    // La aceptación y la solicitud comparten transacción en el CI sólo si fueran la misma; aquí son
    // peticiones distintas, así que accepted_at es posterior a created_at.
    const back = await list(asker);
    expect(back).toHaveLength(1);
    expect(back[0].kind).toBe("follow_accepted");
    expect(back[0].actor_username).toBe(priv.username);
    // Un tercero no ve esa aceptación.
    expect(await list(loud)).toEqual([]);
  });
});

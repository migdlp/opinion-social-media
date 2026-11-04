// ACCOUNT-001: eliminar la cuenta por HTTP contra Supabase LOCAL real (GoTrue + PostgREST). Es la
// prueba que ejecuta delete_my_account con el stack de verdad: demuestra que el propietario de la
// función puede borrar de auth.users y que la cascada no deja rastro. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-deletion-test-only";

type Account = { id: string; email: string; token: string; username: string };
async function account(label: string, profile = true): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@deletion.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `acd${id.replaceAll("-", "").slice(0, 12)}`;
  if (profile) {
    const inserted = await admin.from("profiles").insert({ user_id: id, username });
    if (inserted.error) throw inserted.error;
  }
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (session.error) throw session.error;
  return { id, email, username, token: session.data.session!.access_token };
}

async function request(path: string, token?: string, body?: object, method = "POST") {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, text, data: text ? JSON.parse(text) : null };
}
const rpc = (name: string, args: object, user?: Account) =>
  request(`rpc/${name}`, user?.token, args);

async function authUserExists(id: string): Promise<boolean> {
  const { data } = await admin.auth.admin.getUserById(id);
  return Boolean(data?.user);
}
async function count(table: string, column: string, value: string): Promise<number> {
  const { count: n, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return n ?? 0;
}
async function optionIds(poll: string): Promise<string[]> {
  const { data, error } = await admin
    .from("poll_options")
    .select("id")
    .eq("poll_id", poll)
    .order("position");
  if (error) throw error;
  return data.map((o) => o.id);
}

let doomed: Account, other: Account, stranger: Account;
let pollDoomed: string, pollOther: string;

beforeAll(async () => {
  [doomed, other, stranger] = await Promise.all([
    account("doomed"),
    account("other"),
    account("stranger", false),
  ]);
  const created = await Promise.all([
    rpc(
      "create_poll",
      { p_question: "¿Esta encuesta se borra con su autora?", p_options: ["Sí", "No"] },
      doomed,
    ),
    rpc(
      "create_poll",
      { p_question: "¿Esta encuesta sobrevive a otra cuenta?", p_options: ["Sí", "No"] },
      other,
    ),
  ]);
  expect(created.map((r) => r.status)).toEqual([200, 200]);
  [pollDoomed, pollOther] = [created[0].data, created[1].data];
  const [doomedOpts, otherOpts] = await Promise.all([optionIds(pollDoomed), optionIds(pollOther)]);
  // doomed y other votan en la encuesta de other; other vota en la de doomed.
  const votes = await Promise.all([
    rpc("vote_poll", { p_poll_id: pollOther, p_option_id: otherOpts[0] }, doomed),
    rpc("vote_poll", { p_poll_id: pollOther, p_option_id: otherOpts[1] }, other),
    rpc("vote_poll", { p_poll_id: pollDoomed, p_option_id: doomedOpts[0] }, other),
  ]);
  expect(votes.map((r) => r.status)).toEqual([200, 200, 200]);
  expect(await count("votes", "poll_id", pollOther)).toBe(2);
  expect(await count("votes", "poll_id", pollDoomed)).toBe(1);
}, 60_000);

describe("eliminar la cuenta por HTTP", () => {
  it("anon no puede ejecutar delete_my_account", async () => {
    const r = await rpc("delete_my_account", { p_confirm: doomed.username });
    expect([401, 403]).toContain(r.status);
    expect(await authUserExists(doomed.id)).toBe(true);
  });

  it("una confirmación incorrecta no borra nada ni reserva el @usuario", async () => {
    // Con perfil no vale «eliminar», ni el @usuario ajeno, ni espacios añadidos.
    for (const wrong of ["eliminar", other.username, ` ${doomed.username}`, "", null]) {
      const r = await rpc("delete_my_account", { p_confirm: wrong }, doomed);
      expect(r.status, String(wrong)).toBe(400);
      expect(r.data.message).toBe("CONFIRMATION_MISMATCH");
    }
    expect(await authUserExists(doomed.id)).toBe(true);
    expect(await count("profiles", "user_id", doomed.id)).toBe(1);
    expect(await count("released_usernames", "username", doomed.username)).toBe(0);
  });

  it("no hay forma de indicar otra identidad: nadie borra a otra persona", async () => {
    for (const extra of [{ p_user_id: other.id }, { p_target: other.id }, { p_id: other.id }]) {
      const r = await rpc("delete_my_account", { p_confirm: doomed.username, ...extra }, doomed);
      expect(r.status).toBe(404); // PGRST202: no existe esa firma
    }
    // Escribir el @usuario ajeno como confirmación tampoco sirve: se compara con el propio.
    const r = await rpc("delete_my_account", { p_confirm: other.username }, doomed);
    expect(r.data.message).toBe("CONFIRMATION_MISMATCH");
    expect(await authUserExists(other.id)).toBe(true);
    expect(await authUserExists(doomed.id)).toBe(true);
  });

  it("la tabla de @usuarios reservados no es legible ni escribible por clientes", async () => {
    const anon = await request("released_usernames?select=*", undefined, undefined, "GET");
    expect([401, 403]).toContain(anon.status);
    const signedIn = await request("released_usernames?select=*", other.token, undefined, "GET");
    expect([401, 403]).toContain(signedIn.status);
    const write = await request("released_usernames", other.token, { username: "intruso" });
    expect([401, 403]).toContain(write.status);
  });

  it("borra la cuenta y todos sus datos sin dejar rastro", async () => {
    const r = await rpc("delete_my_account", { p_confirm: doomed.username.toUpperCase() }, doomed);
    expect(r.status).toBe(204);

    expect(await authUserExists(doomed.id)).toBe(false);
    expect(await count("profiles", "user_id", doomed.id)).toBe(0);
    expect(await count("polls", "user_id", doomed.id)).toBe(0);
    expect(await count("votes", "user_id", doomed.id)).toBe(0);
    // Su encuesta se lleva opciones y votos ajenos.
    expect(await count("polls", "id", pollDoomed)).toBe(0);
    expect(await count("poll_options", "poll_id", pollDoomed)).toBe(0);
    expect(await count("votes", "poll_id", pollDoomed)).toBe(0);
  });

  it("los totales de las encuestas ajenas bajan y lo ajeno sigue", async () => {
    expect(await count("votes", "poll_id", pollOther)).toBe(1);
    expect(await count("polls", "id", pollOther)).toBe(1);
    expect(await count("profiles", "user_id", other.id)).toBe(1);
    expect(await authUserExists(other.id)).toBe(true);
  });

  it("el @usuario queda reservado y la cuenta no vuelve a iniciar sesión", async () => {
    expect(await count("released_usernames", "username", doomed.username)).toBe(1);
    const client = createClient(URL_, key, { auth: { persistSession: false } });
    const login = await client.auth.signInWithPassword({ email: doomed.email, password: PASSWORD });
    expect(login.error).not.toBeNull();
    expect(login.data.session).toBeNull();
  });

  it("otra cuenta no puede registrar el @usuario reservado; los demás siguen libres", async () => {
    const taken = await rpc(
      "upsert_my_profile",
      { p_username: doomed.username, p_display_name: null },
      stranger,
    );
    expect(taken.status).toBe(400);
    expect(taken.data.message).toBe("USERNAME_TAKEN");
    const upper = await rpc(
      "upsert_my_profile",
      { p_username: doomed.username.toUpperCase(), p_display_name: null },
      stranger,
    );
    expect(upper.data.message).toBe("USERNAME_TAKEN");
    expect(await count("profiles", "user_id", stranger.id)).toBe(0);
    const free = await rpc(
      "upsert_my_profile",
      { p_username: `${doomed.username}x`, p_display_name: null },
      stranger,
    );
    expect(free.status).toBe(200);
  });

  it("el JWT antiguo no puede crear, votar ni comentar", async () => {
    // El token sigue siendo válido hasta caducar (es sin estado), pero la cuenta ya no existe.
    const [optA] = await optionIds(pollOther);
    const created = await rpc(
      "create_poll",
      { p_question: "¿Puede publicar una cuenta eliminada?", p_options: ["Sí", "No"] },
      doomed,
    );
    expect(created.data.message).toBe("PROFILE_REQUIRED");
    const voted = await rpc("vote_poll", { p_poll_id: pollOther, p_option_id: optA }, doomed);
    expect(voted.data.message).toBe("PROFILE_REQUIRED");
    const commented = await rpc("add_comment", { p_poll_id: pollOther, p_body: "Hola" }, doomed);
    expect(commented.data.message).toBe("PROFILE_REQUIRED");
    expect(await count("polls", "user_id", doomed.id)).toBe(0);
    expect(await count("votes", "user_id", doomed.id)).toBe(0);
    expect(await count("comments", "user_id", doomed.id)).toBe(0);
  });
});

// PRIV-001: permisos reales por HTTP. Sólo datos sintéticos de Supabase LOCAL.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
type Account = { id: string; token: string; username: string };
async function account(label: string, profile = true): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@visibility.test`;
  const password = "local-visibility-test-only";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `vis${id.replaceAll("-", "").slice(0, 12)}`;
  if (profile) {
    const inserted = await admin.from("profiles").insert({ user_id: id, username });
    if (inserted.error) throw inserted.error;
  }
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await client.auth.signInWithPassword({ email, password });
  if (session.error) throw session.error;
  return { id, username, token: session.data.session!.access_token };
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
let owner: Account, follower: Account, pending: Account, stranger: Account, noProfile: Account;
let poll: string;
beforeAll(async () => {
  [owner, follower, pending, stranger, noProfile] = await Promise.all([
    account("owner"),
    account("follower"),
    account("pending"),
    account("stranger"),
    account("no-profile", false),
  ]);
  const created = await rpc(
    "create_poll",
    { p_question: "¿La actividad de voto está protegida?", p_options: ["Sí", "No"] },
    owner,
  );
  expect(created.status).toBe(200);
  poll = created.data;
  const options = await admin
    .from("poll_options")
    .select("id")
    .eq("poll_id", poll)
    .order("position");
  if (options.error) throw options.error;
  expect(
    (await rpc("vote_poll", { p_poll_id: poll, p_option_id: options.data[0].id }, owner)).status,
  ).toBe(200);
  const follows = await admin.from("follows").insert([
    { follower_id: follower.id, followee_id: owner.id, status: "accepted" },
    { follower_id: pending.id, followee_id: owner.id, status: "pending" },
  ]);
  if (follows.error) throw follows.error;
}, 60_000);

describe("audiencia del historial por HTTP", () => {
  it("defecto Solo yo: ni seguidor, pendiente, extraño ni anon reciben actividad", async () => {
    expect((await rpc("get_my_vote_visibility", {}, owner)).data).toBe("private");
    for (const viewer of [follower, pending, stranger, undefined]) {
      const r = await rpc("get_profile_votes", { p_username: owner.username }, viewer);
      expect(r.data.message).toBe("VOTES_PRIVATE");
      expect(r.text).not.toContain(poll);
    }
  });
  for (const isPrivate of [false, true])
    for (const mode of ["private", "followers", "profile"]) {
      it(`${isPrivate ? "cuenta privada" : "cuenta pública"}, audiencia ${mode}: matriz de relaciones`, async () => {
        expect((await rpc("set_profile_privacy", { p_private: isPrivate }, owner)).status).toBe(
          204,
        );
        // Pasar a pública acepta solicitudes (S-6); conservar un pendiente real en esta matriz.
        const reset = await admin
          .from("follows")
          .update({ status: "pending" })
          .eq("follower_id", pending.id)
          .eq("followee_id", owner.id);
        if (reset.error) throw reset.error;
        expect((await rpc("set_vote_visibility", { p_visibility: mode }, owner)).status).toBe(204);
        for (const viewer of [owner, follower, pending, stranger, undefined]) {
          const mine = viewer === owner;
          const accepted = viewer === follower;
          const allowed =
            mine ||
            ((!isPrivate || accepted) &&
              (mode === "profile" || (mode === "followers" && accepted)));
          const r = await rpc("get_profile_votes", { p_username: owner.username }, viewer);
          if (allowed) {
            expect(r.status).toBe(200);
            expect(r.data).toHaveLength(1);
            expect(r.data[0]).toMatchObject({ poll_id: poll, choice_hidden: !mine });
            if (!mine) expect(r.data[0].option_id).toBeNull();
            expect(r.text).not.toMatch(/total_votes|percentage|user_id/);
          } else {
            expect(r.data.message).toBe(
              isPrivate && !accepted ? "PROFILE_PRIVATE" : "VOTES_PRIVATE",
            );
            expect(r.text).not.toContain(poll);
          }
        }
      });
    }
  it("no se permite leer/escribir columnas ni preferencias ajenas", async () => {
    for (const user of [owner, stranger, undefined]) {
      expect(
        (await request("profiles?select=vote_visibility", user?.token, undefined, "GET")).status,
      ).toBeGreaterThanOrEqual(400);
      expect(
        (
          await request(
            `profiles?username=eq.${owner.username}`,
            user?.token,
            { vote_visibility: "profile" },
            "PATCH",
          )
        ).status,
      ).toBeGreaterThanOrEqual(400);
    }
    expect(
      (await rpc("set_vote_visibility", { p_visibility: "profile", p_user_id: owner.id }, stranger))
        .status,
    ).toBeGreaterThanOrEqual(400);
    expect((await rpc("get_my_vote_visibility", {}, stranger)).data).toBe("private");
    expect((await rpc("get_my_vote_visibility", {})).status).toBeGreaterThanOrEqual(400);
  });
  it("validación y cuenta sin perfil devuelven errores controlados", async () => {
    for (const p_visibility of [null, "all", "", "PRIVATE"])
      expect((await rpc("set_vote_visibility", { p_visibility }, owner)).data.message).toBe(
        "VOTE_VISIBILITY_INVALID",
      );
    for (const name of ["get_my_vote_visibility", "set_vote_visibility"])
      expect(
        (await rpc(name, name.startsWith("set") ? { p_visibility: "private" } : {}, noProfile)).data
          .message,
      ).toBe("PROFILE_REQUIRED");
  });
  it("cambiar la audiencia no modifica votos/agregados ni evita la comprobación de voto previo", async () => {
    await rpc("set_profile_privacy", { p_private: false }, owner);
    await rpc("set_vote_visibility", { p_visibility: "private" }, owner);
    const r = await rpc("get_poll_results", { p_poll_id: poll }, owner);
    expect(r.status).toBe(200);
    expect(r.data[0].total_votes).toBe(1);
    expect((await rpc("get_poll_results", { p_poll_id: poll }, stranger)).data.message).toBe(
      "NOT_VOTED",
    );
    const closed = await admin
      .from("polls")
      .update({
        created_at: new Date(Date.now() - 172800000).toISOString(),
        closes_at: new Date(Date.now() - 86400000).toISOString(),
      })
      .eq("id", poll);
    if (closed.error) throw closed.error;
    expect((await rpc("get_poll_results", { p_poll_id: poll })).data[0].total_votes).toBe(1);
    expect(
      (await rpc("get_profile_votes", { p_username: owner.username }, follower)).data.message,
    ).toBe("VOTES_PRIVATE");
  });
  it("revocar seguimiento cierra la lectura aunque se reutilice el cursor anterior", async () => {
    await rpc("set_vote_visibility", { p_visibility: "followers" }, owner);
    const before = await rpc("get_profile_votes", { p_username: owner.username }, follower);
    expect(before.status).toBe(200);
    const deleted = await admin
      .from("follows")
      .delete()
      .eq("follower_id", follower.id)
      .eq("followee_id", owner.id);
    if (deleted.error) throw deleted.error;
    const after = await rpc(
      "get_profile_votes",
      { p_username: owner.username, p_cursor: before.data[0].cursor },
      follower,
    );
    expect(after.data.message).toBe("VOTES_PRIVATE");
    expect(after.text).not.toContain(poll);
  });
});

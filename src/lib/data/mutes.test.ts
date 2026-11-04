import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { getProfileView, listMutedUsers, muteUser, unmuteUser } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

describe("muteUser / unmuteUser (SOCIAL-003)", () => {
  it.each([
    ["mute_user", muteUser],
    ["unmute_user", unmuteUser],
  ])("%s llama a la RPC con el @usuario", async (rpc, run) => {
    const { supabase, queries } = fakeSupabase({ [`rpc:${rpc}`]: { data: null, error: null } });
    expect(await run(supabase, "perfil_b")).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual(["rpc", rpc, { p_username: "perfil_b" }]);
  });

  it.each(["CANNOT_MUTE_SELF", "USER_NOT_FOUND", "AUTH_REQUIRED", "PROFILE_REQUIRED"])(
    "muteUser propaga %s",
    async (code) => {
      const { supabase } = fakeSupabase({
        "rpc:mute_user": { data: null, error: { code: "P0001", message: code } },
      });
      expect(await muteUser(supabase, "perfil_b")).toEqual({ ok: false, error: code });
    },
  );

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:unmute_user": networkThrow });
    expect(await unmuteUser(supabase, "perfil_b")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });

  it("CANNOT_MUTE_SELF tiene el texto de la ficha", () => {
    expect(ERROR_MESSAGES.CANNOT_MUTE_SELF).toBe("No puedes silenciarte a ti mismo.");
  });
});

describe("listMutedUsers (SOCIAL-003)", () => {
  const row = (n: number) => ({
    username: `silenciada_${n}`,
    display_name: n % 2 ? `Nombre ${n}` : null,
    cursor: `2026-11-04T10:00:0${n}.000000Z|silenciada_${n}`,
  });

  it("pide la página con el cursor y devuelve usuarios sin user_id", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_muted_users": { data: [row(1), row(2)], error: null },
    });
    const res = await listMutedUsers(supabase, "c1");
    expect(queries[0].calls[0]).toEqual(["rpc", "list_muted_users", { p_cursor: "c1" }]);
    expect(res).toEqual({
      ok: true,
      data: {
        users: [
          { username: "silenciada_1", displayName: "Nombre 1" },
          { username: "silenciada_2", displayName: null },
        ],
        nextCursor: null,
      },
    });
  });

  it("con 31 filas conserva 30 y entrega el cursor de la última visible", async () => {
    const rows = Array.from({ length: 31 }, (_, i) => row(i));
    const { supabase } = fakeSupabase({ "rpc:list_muted_users": { data: rows, error: null } });
    const res = await listMutedUsers(supabase);
    expect(res.ok && res.data.users).toHaveLength(30);
    expect(res.ok && res.data.nextCursor).toBe(rows[29].cursor);
  });

  it("sin sesión propaga AUTH_REQUIRED y un fallo de red no lanza", async () => {
    const auth = fakeSupabase({
      "rpc:list_muted_users": { data: null, error: { code: "P0001", message: "AUTH_REQUIRED" } },
    });
    expect(await listMutedUsers(auth.supabase)).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    const net = fakeSupabase({ "rpc:list_muted_users": networkThrow });
    expect(await listMutedUsers(net.supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("isMuted viaja con el perfil (SOCIAL-003)", () => {
  const header = {
    username: "perfil_b",
    display_name: null,
    is_private: false,
    followers_count: 0,
    following_count: 0,
    polls_count: 0,
    viewer_relation: "none",
    can_view_content: true,
  };

  it("lo entrega sólo cuando es verdadero", async () => {
    const muted = fakeSupabase({
      "rpc:get_profile": { data: [{ ...header, is_muted: true }], error: null },
    });
    const a = await getProfileView(muted.supabase, "perfil_b");
    expect(a.ok && a.data.isMuted).toBe(true);

    const notMuted = fakeSupabase({
      "rpc:get_profile": { data: [{ ...header, is_muted: false }], error: null },
    });
    const b = await getProfileView(notMuted.supabase, "perfil_b");
    expect(b.ok && "isMuted" in b.data).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { blockUser, listBlockedUsers, unblockUser } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

describe("blockUser / unblockUser (SOCIAL-001)", () => {
  it.each([
    ["block_user", blockUser],
    ["unblock_user", unblockUser],
  ])("%s llama a la RPC con el @usuario", async (rpc, run) => {
    const { supabase, queries } = fakeSupabase({ [`rpc:${rpc}`]: { data: null, error: null } });
    expect(await run(supabase, "perfil_b")).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual(["rpc", rpc, { p_username: "perfil_b" }]);
  });

  it.each(["CANNOT_BLOCK_SELF", "USER_NOT_FOUND", "AUTH_REQUIRED", "PROFILE_REQUIRED"])(
    "blockUser propaga %s",
    async (code) => {
      const { supabase } = fakeSupabase({
        "rpc:block_user": { data: null, error: { code: "P0001", message: code } },
      });
      expect(await blockUser(supabase, "perfil_b")).toEqual({ ok: false, error: code });
    },
  );

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:block_user": networkThrow });
    expect(await blockUser(supabase, "perfil_b")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });

  it("CANNOT_BLOCK_SELF tiene un mensaje para la interfaz", () => {
    expect(ERROR_MESSAGES.CANNOT_BLOCK_SELF).toBeTruthy();
  });
});

describe("listBlockedUsers (SOCIAL-002)", () => {
  const row = (n: number) => ({
    username: `bloqueado_${n}`,
    display_name: n % 2 ? `Nombre ${n}` : null,
    cursor: `2026-10-30T10:00:0${n}.000000Z|bloqueado_${n}`,
  });

  it("pide la página con el cursor y devuelve usuarios sin user_id", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_blocked_users": { data: [row(1), row(2)], error: null },
    });
    const res = await listBlockedUsers(supabase, "c1");
    expect(queries[0].calls[0]).toEqual(["rpc", "list_blocked_users", { p_cursor: "c1" }]);
    expect(res).toEqual({
      ok: true,
      data: {
        users: [
          { username: "bloqueado_1", displayName: "Nombre 1" },
          { username: "bloqueado_2", displayName: null },
        ],
        nextCursor: null,
      },
    });
  });

  it("con 31 filas conserva 30 y entrega el cursor de la última visible", async () => {
    const rows = Array.from({ length: 31 }, (_, i) => row(i));
    const { supabase } = fakeSupabase({ "rpc:list_blocked_users": { data: rows, error: null } });
    const res = await listBlockedUsers(supabase);
    expect(res.ok && res.data.users).toHaveLength(30);
    expect(res.ok && res.data.nextCursor).toBe(rows[29].cursor);
  });

  it("sin sesión propaga AUTH_REQUIRED y un fallo de red no lanza", async () => {
    const auth = fakeSupabase({
      "rpc:list_blocked_users": { data: null, error: { code: "P0001", message: "AUTH_REQUIRED" } },
    });
    expect(await listBlockedUsers(auth.supabase)).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    const net = fakeSupabase({ "rpc:list_blocked_users": networkThrow });
    expect(await listBlockedUsers(net.supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { blockUser, unblockUser } from "./operations";
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

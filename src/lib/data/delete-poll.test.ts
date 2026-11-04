import { describe, expect, it } from "vitest";
import { deleteMyPoll } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const ID = "10000000-0000-4000-8000-000000000001";

describe("deleteMyPoll (POLL-004)", () => {
  it("llama a delete_my_poll con el id y no devuelve datos", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:delete_my_poll": { data: null, error: null },
    });
    expect(await deleteMyPoll(supabase, ID)).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual(["rpc", "delete_my_poll", { p_poll_id: ID }]);
  });

  it.each(["AUTH_REQUIRED", "POLL_UNAVAILABLE"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:delete_my_poll": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await deleteMyPoll(supabase, ID)).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza y la falta de permiso de anon es AUTH_REQUIRED", async () => {
    const net = fakeSupabase({ "rpc:delete_my_poll": networkThrow });
    expect(await deleteMyPoll(net.supabase, ID)).toEqual({ ok: false, error: "NETWORK_ERROR" });
    const denied = fakeSupabase({
      "rpc:delete_my_poll": { data: null, error: { code: "42501", message: "permission denied" } },
    });
    expect(await deleteMyPoll(denied.supabase, ID)).toEqual({ ok: false, error: "AUTH_REQUIRED" });
  });
});

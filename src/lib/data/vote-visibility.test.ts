import { describe, expect, it } from "vitest";
import { getMyVoteVisibility, setVoteVisibility } from "./operations";
import { toAppError } from "./errors";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

describe("audiencia del historial de votos", () => {
  it.each(["private", "followers", "profile"] as const)(
    "lee y guarda %s sin enviar identidad ajena",
    async (visibility) => {
      const read = fakeSupabase({
        "rpc:get_my_vote_visibility": { data: visibility, error: null },
      });
      expect(await getMyVoteVisibility(read.supabase)).toEqual({ ok: true, data: visibility });
      const write = fakeSupabase({ "rpc:set_vote_visibility": { data: null, error: null } });
      expect(await setVoteVisibility(write.supabase, visibility)).toEqual({
        ok: true,
        data: undefined,
      });
      expect(write.queries[0].calls).toContainEqual([
        "rpc",
        "set_vote_visibility",
        { p_visibility: visibility },
      ]);
    },
  );
  it("rechaza respuestas de preferencia no reconocidas", async () => {
    const { supabase } = fakeSupabase({
      "rpc:get_my_vote_visibility": { data: "unexpected", error: null },
    });
    expect(await getMyVoteVisibility(supabase)).toEqual({ ok: false, error: "UNKNOWN" });
  });
  it.each(["AUTH_REQUIRED", "PROFILE_REQUIRED", "VOTES_PRIVATE", "VOTE_VISIBILITY_INVALID"])(
    "traduce %s",
    (message) => {
      expect(toAppError({ code: "P0001", message })).toBe(message);
    },
  );
  it("traduce una caída de red sin exponer errores SQL", async () => {
    const { supabase } = fakeSupabase({ "rpc:get_my_vote_visibility": networkThrow });
    expect(await getMyVoteVisibility(supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

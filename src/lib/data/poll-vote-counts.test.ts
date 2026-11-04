import { describe, expect, it } from "vitest";
import { getPollVoteCounts } from "./polls";
import { fakeSupabase } from "./testing/fake-supabase";

const A = "11111111-2222-4333-8444-555555555555";
const B = "11111111-2222-4333-8444-666666666666";

describe("getPollVoteCounts (RESULTS-005, D-044)", () => {
  it("devuelve un mapa id → total y sólo llama con ids válidas y sin duplicados", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:get_poll_vote_counts": {
        data: [
          { poll_id: A, total_votes: 3 },
          { poll_id: B, total_votes: 0 },
        ],
        error: null,
      },
    });
    const result = await getPollVoteCounts(supabase, [A, "no-uuid", A, B]);
    expect(result).toEqual({ ok: true, data: { [A]: 3, [B]: 0 } });
    expect(queries[0].calls[0]).toEqual(["rpc", "get_poll_vote_counts", { p_poll_ids: [A, B] }]);
  });

  it("recorta a 20 ids", async () => {
    const ids = Array.from(
      { length: 25 },
      (_, i) => `11111111-2222-4333-8444-${String(i).padStart(12, "0")}`,
    );
    const { supabase, queries } = fakeSupabase({
      "rpc:get_poll_vote_counts": { data: [], error: null },
    });
    await getPollVoteCounts(supabase, ids);
    const args = queries[0].calls[0][2] as { p_poll_ids: string[] };
    expect(args.p_poll_ids).toHaveLength(20);
  });

  it("sin ids válidas no llama al servidor", async () => {
    const { supabase, queries } = fakeSupabase({});
    expect(await getPollVoteCounts(supabase, ["x"])).toEqual({ ok: true, data: {} });
    expect(queries).toHaveLength(0);
  });

  it("propaga el error como AppError", async () => {
    const { supabase } = fakeSupabase({
      "rpc:get_poll_vote_counts": { data: null, error: { message: "boom", code: "XX000" } },
    });
    const result = await getPollVoteCounts(supabase, [A]);
    expect(result.ok).toBe(false);
  });
});

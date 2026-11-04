import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { dismissPoll, listDismissedPolls, undismissPoll } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const POLL = "11111111-2222-4333-8444-555555555555";

describe("dismissPoll / undismissPoll (FEED-003)", () => {
  it.each([
    ["dismiss_poll", dismissPoll],
    ["undismiss_poll", undismissPoll],
  ])("%s llama a la RPC con el id de la encuesta", async (rpc, run) => {
    const { supabase, queries } = fakeSupabase({ [`rpc:${rpc}`]: { data: null, error: null } });
    expect(await run(supabase, POLL)).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual(["rpc", rpc, { p_poll_id: POLL }]);
  });

  it.each(["CANNOT_DISMISS_OWN", "POLL_UNAVAILABLE", "AUTH_REQUIRED"])(
    "dismissPoll propaga %s",
    async (code) => {
      const { supabase } = fakeSupabase({
        "rpc:dismiss_poll": { data: null, error: { code: "P0001", message: code } },
      });
      expect(await dismissPoll(supabase, POLL)).toEqual({ ok: false, error: code });
    },
  );

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:undismiss_poll": networkThrow });
    expect(await undismissPoll(supabase, POLL)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });

  it("CANNOT_DISMISS_OWN tiene el texto de la ficha", () => {
    expect(ERROR_MESSAGES.CANNOT_DISMISS_OWN).toBe("No puedes descartar tus propias encuestas.");
  });
});

describe("listDismissedPolls (FEED-003)", () => {
  const row = (n: number) => ({
    poll_id: `11111111-2222-4333-8444-${String(n).padStart(12, "0")}`,
    dismissed_at: `2026-11-04T10:00:${String(n).padStart(2, "0")}.000000Z`,
    cursor: `2026-11-04T10:00:${String(n).padStart(2, "0")}.000000Z|${n}`,
  });

  it("pide la página con el cursor y devuelve sólo ids", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_dismissed_polls": { data: [row(1), row(2)], error: null },
    });
    const res = await listDismissedPolls(supabase, "c1");
    expect(queries[0].calls[0]).toEqual(["rpc", "list_dismissed_polls", { p_cursor: "c1" }]);
    expect(res).toEqual({
      ok: true,
      data: { pollIds: [row(1).poll_id, row(2).poll_id], nextCursor: null },
    });
  });

  it("con 21 filas conserva 20 y entrega el cursor de la última visible", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => row(i));
    const { supabase } = fakeSupabase({ "rpc:list_dismissed_polls": { data: rows, error: null } });
    const res = await listDismissedPolls(supabase);
    expect(res.ok && res.data.pollIds).toHaveLength(20);
    expect(res.ok && res.data.nextCursor).toBe(rows[19].cursor);
  });

  it("propaga INVALID_CURSOR y AUTH_REQUIRED, y un fallo de red no lanza", async () => {
    for (const code of ["INVALID_CURSOR", "AUTH_REQUIRED"]) {
      const { supabase } = fakeSupabase({
        "rpc:list_dismissed_polls": { data: null, error: { code: "P0001", message: code } },
      });
      expect(await listDismissedPolls(supabase)).toEqual({ ok: false, error: code });
    }
    const net = fakeSupabase({ "rpc:list_dismissed_polls": networkThrow });
    expect(await listDismissedPolls(net.supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

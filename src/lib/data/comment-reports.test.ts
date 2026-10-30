import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { reportComment } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const COMMENT = "00000000-0000-4000-8000-000000000001";

describe("reportComment (CMT-003)", () => {
  it("llama a report_comment con el comentario, el motivo y el detalle", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:report_comment": { data: null, error: null },
    });
    expect(await reportComment(supabase, COMMENT, "acoso", "Ofensivo")).toEqual({
      ok: true,
      data: undefined,
    });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "report_comment",
      { p_comment_id: COMMENT, p_reason: "acoso", p_details: "Ofensivo" },
    ]);
  });

  it("sin detalle manda null", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:report_comment": { data: null, error: null },
    });
    await reportComment(supabase, COMMENT, "spam");
    expect(queries[0].calls[0][2]).toMatchObject({ p_details: null });
  });

  it.each([
    "COMMENT_UNAVAILABLE",
    "CANNOT_REPORT_SELF",
    "REPORT_INVALID",
    "ALREADY_REPORTED",
    "REPORT_RATE_LIMITED",
    "AUTH_REQUIRED",
  ])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:report_comment": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await reportComment(supabase, COMMENT, "spam")).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:report_comment": networkThrow });
    expect(await reportComment(supabase, COMMENT, "spam")).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });

  it("COMMENT_UNAVAILABLE tiene un mensaje para la interfaz", () => {
    expect(ERROR_MESSAGES.COMMENT_UNAVAILABLE).toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { reportUser } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

describe("reportUser (MOD-001)", () => {
  it("llama a report_user con el @usuario, el motivo y el detalle", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:report_user": { data: null, error: null } });
    expect(await reportUser(supabase, "perfil_b", "acoso", "Me escribe")).toEqual({
      ok: true,
      data: undefined,
    });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "report_user",
      { p_username: "perfil_b", p_reason: "acoso", p_details: "Me escribe" },
    ]);
  });

  it("sin detalle manda null", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:report_user": { data: null, error: null } });
    await reportUser(supabase, "perfil_b", "spam");
    expect(queries[0].calls[0][2]).toMatchObject({ p_details: null });
  });

  it.each([
    "CANNOT_REPORT_SELF",
    "USER_NOT_FOUND",
    "REPORT_INVALID",
    "ALREADY_REPORTED",
    "REPORT_RATE_LIMITED",
    "AUTH_REQUIRED",
  ])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:report_user": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await reportUser(supabase, "perfil_b", "spam")).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:report_user": networkThrow });
    expect(await reportUser(supabase, "perfil_b", "spam")).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });

  it("CANNOT_REPORT_SELF tiene un mensaje para la interfaz", () => {
    expect(ERROR_MESSAGES.CANNOT_REPORT_SELF).toBeTruthy();
  });
});

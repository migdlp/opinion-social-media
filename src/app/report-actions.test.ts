import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const reportPoll = vi.fn();
vi.mock("@/lib/data/operations", () => ({ reportPoll }));

const { submitReport } = await import("./report-actions");

beforeEach(() => {
  getUser.mockReset();
  reportPoll.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  reportPoll.mockResolvedValue({ ok: true, data: undefined });
});

describe("submitReport", () => {
  it("con sesión denuncia una vez y devuelve ok", async () => {
    expect(await submitReport("p1", "spam", "texto")).toEqual({ ok: true, data: undefined });
    expect(reportPoll).toHaveBeenCalledOnce();
    expect(reportPoll.mock.calls[0].slice(1)).toEqual(["p1", "spam", "texto"]);
  });

  it("sin sesión no llega a la base de datos y pide autenticación", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await submitReport("p1", "spam")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(reportPoll).not.toHaveBeenCalled();
  });

  it("propaga el error controlado del adaptador", async () => {
    reportPoll.mockResolvedValue({ ok: false, error: "ALREADY_REPORTED" });
    expect(await submitReport("p1", "spam")).toEqual({ ok: false, error: "ALREADY_REPORTED" });
  });

  it("si Supabase no responde devuelve un error de red, sin lanzar", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await submitReport("p1", "spam")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

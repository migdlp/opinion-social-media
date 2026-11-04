import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const exportMyData = vi.fn();
vi.mock("@/lib/data/operations", () => ({ exportMyData }));

const { exportDataAction } = await import("./export-actions");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-04T09:30:00Z"));
  getUser.mockReset();
  exportMyData.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});
afterEach(() => vi.useRealTimers());

describe("exportDataAction (ACCOUNT-003)", () => {
  it("devuelve el JSON con sangría de 2 espacios y el nombre opinion-datos-AAAA-MM-DD.json", async () => {
    exportMyData.mockResolvedValue({ ok: true, data: { formato: "opinion-export", version: 1 } });
    const result = await exportDataAction();
    expect(result).toEqual({
      ok: true,
      data: {
        filename: "opinion-datos-2026-11-04.json",
        content: '{\n  "formato": "opinion-export",\n  "version": 1\n}',
      },
    });
    expect(exportMyData).toHaveBeenCalledOnce();
  });

  it("sin sesión no llega a la base de datos", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await exportDataAction()).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(exportMyData).not.toHaveBeenCalled();
  });

  it("propaga el límite de frecuencia", async () => {
    exportMyData.mockResolvedValue({ ok: false, error: "DATA_EXPORT_RATE_LIMITED" });
    expect(await exportDataAction()).toEqual({ ok: false, error: "DATA_EXPORT_RATE_LIMITED" });
  });

  it("un fallo de red se devuelve como error controlado, sin lanzar", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await exportDataAction()).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

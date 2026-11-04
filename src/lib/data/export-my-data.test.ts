import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { exportMyData } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

describe("exportMyData (ACCOUNT-003)", () => {
  it("llama a export_my_data sin argumentos y devuelve el documento", async () => {
    const doc = { formato: "opinion-export", version: 1 };
    const { supabase, queries } = fakeSupabase({
      "rpc:export_my_data": { data: doc, error: null },
    });
    expect(await exportMyData(supabase)).toEqual({ ok: true, data: doc });
    expect(queries[0].calls[0].slice(0, 2)).toEqual(["rpc", "export_my_data"]);
    expect(queries[0].calls[0][2]).toBeUndefined();
  });

  it.each(["AUTH_REQUIRED", "DATA_EXPORT_RATE_LIMITED"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:export_my_data": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await exportMyData(supabase)).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:export_my_data": networkThrow });
    expect(await exportMyData(supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });

  it("DATA_EXPORT_RATE_LIMITED tiene el texto exacto para la interfaz", () => {
    expect(ERROR_MESSAGES.DATA_EXPORT_RATE_LIMITED).toBe(
      "Ya has descargado tus datos hace poco. Inténtalo de nuevo en unos minutos.",
    );
  });
});

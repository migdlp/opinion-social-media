import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { deleteMyAccount } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

describe("deleteMyAccount (ACCOUNT-001)", () => {
  it("llama a delete_my_account sólo con la confirmación", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:delete_my_account": { data: null, error: null },
    });
    expect(await deleteMyAccount(supabase, "ana_23")).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual(["rpc", "delete_my_account", { p_confirm: "ana_23" }]);
  });

  it("no manda ningún identificador de cuenta: la cuenta es siempre la de la sesión", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:delete_my_account": { data: null, error: null },
    });
    await deleteMyAccount(supabase, "eliminar");
    expect(Object.keys(queries[0].calls[0][2] as object)).toEqual(["p_confirm"]);
  });

  it.each(["AUTH_REQUIRED", "CONFIRMATION_MISMATCH"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:delete_my_account": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await deleteMyAccount(supabase, "ana_23")).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:delete_my_account": networkThrow });
    expect(await deleteMyAccount(supabase, "ana_23")).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });

  it("CONFIRMATION_MISMATCH tiene el texto exacto para la interfaz", () => {
    expect(ERROR_MESSAGES.CONFIRMATION_MISMATCH).toBe(
      "Escribe exactamente tu usuario para confirmar.",
    );
  });
});

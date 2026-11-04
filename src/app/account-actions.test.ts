import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser, signOut } }),
}));
const deleteMyAccount = vi.fn();
vi.mock("@/lib/data/operations", () => ({ deleteMyAccount }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

const { deleteAccountAction, reconcileAccountDeletionAction } = await import("./account-actions");

beforeEach(() => {
  getUser.mockReset();
  signOut.mockReset();
  deleteMyAccount.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  signOut.mockResolvedValue({ error: null });
  deleteMyAccount.mockResolvedValue({ ok: true, data: undefined });
});

describe("deleteAccountAction (ACCOUNT-002)", () => {
  it("borra, cierra la sesión localmente y redirige a /?cuenta=eliminada", async () => {
    await expect(deleteAccountAction("ana_23")).rejects.toThrow("REDIRECT:/?cuenta=eliminada");
    expect(deleteMyAccount).toHaveBeenCalledOnce();
    expect(deleteMyAccount.mock.calls[0][1]).toBe("ana_23");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("redirige aunque cerrar la sesión falle: la cuenta ya está borrada", async () => {
    signOut.mockRejectedValue(new TypeError("fetch failed"));
    await expect(deleteAccountAction("ana_23")).rejects.toThrow("REDIRECT:/?cuenta=eliminada");
  });

  it("sin sesión no llega a la base de datos", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await deleteAccountAction("ana_23")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(deleteMyAccount).not.toHaveBeenCalled();
  });

  it("un error de la RPC se devuelve sin cerrar la sesión ni redirigir", async () => {
    deleteMyAccount.mockResolvedValue({ ok: false, error: "CONFIRMATION_MISMATCH" });
    expect(await deleteAccountAction("otra")).toEqual({
      ok: false,
      error: "CONFIRMATION_MISMATCH",
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("un fallo de red al leer la sesión se devuelve como error controlado", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await deleteAccountAction("ana_23")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("reconcileAccountDeletionAction (ACCOUNT-002)", () => {
  it("si la cuenta ya no existe se trata como borrado con éxito", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: {
        code: "user_not_found",
        status: 403,
        message: "User from sub claim in JWT does not exist",
      },
    });
    await expect(reconcileAccountDeletionAction()).rejects.toThrow("REDIRECT:/?cuenta=eliminada");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("si la cuenta sigue existiendo devuelve NETWORK_ERROR y no redirige", async () => {
    expect(await reconcileAccountDeletionAction()).toEqual({ ok: false, error: "NETWORK_ERROR" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("una sesión caducada (sin user_not_found) no se confunde con un borrado", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "session_not_found", status: 401, message: "Auth session missing!" },
    });
    expect(await reconcileAccountDeletionAction()).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });

  it("un fallo de red al comprobar no lanza", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await reconcileAccountDeletionAction()).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

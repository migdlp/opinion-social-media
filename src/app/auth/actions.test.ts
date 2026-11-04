import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutSupabase = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: signOutSupabase } }),
}));
const REDIRECT = new Error("NEXT_REDIRECT");
const redirect = vi.fn((...args: [path: string]) => {
  void args;
  throw REDIRECT;
});
vi.mock("next/navigation", () => ({ redirect }));

const { signOut, signOutEverywhere } = await import("./actions");

beforeEach(() => {
  signOutSupabase.mockReset();
  signOutSupabase.mockResolvedValue({ error: null });
  redirect.mockClear();
});

describe("signOut", () => {
  it("cierra la sesión y vuelve al feed como anónimo", async () => {
    await expect(signOut()).rejects.toBe(REDIRECT);

    expect(signOutSupabase).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("aunque Supabase falle (red caída) vuelve a / sin mostrar error técnico", async () => {
    signOutSupabase.mockRejectedValue(new TypeError("fetch failed"));

    await expect(signOut()).rejects.toBe(REDIRECT);

    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("signOutEverywhere (AUTH-002)", () => {
  it("revoca todas las sesiones con scope global y redirige a /?sesion=cerrada", async () => {
    await expect(signOutEverywhere()).rejects.toBe(REDIRECT);

    expect(signOutSupabase).toHaveBeenCalledExactlyOnceWith({ scope: "global" });
    expect(redirect).toHaveBeenCalledWith("/?sesion=cerrada");
  });

  it("si Supabase devuelve un error, no redirige: la sesión local sigue abierta", async () => {
    signOutSupabase.mockResolvedValue({ error: { message: "boom", status: 500 } });

    expect(await signOutEverywhere()).toEqual({ ok: false, error: "UNKNOWN" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sin red devuelve NETWORK_ERROR y no redirige", async () => {
    signOutSupabase.mockRejectedValue(new TypeError("fetch failed"));

    expect(await signOutEverywhere()).toEqual({ ok: false, error: "NETWORK_ERROR" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

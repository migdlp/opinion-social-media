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

const { signOut } = await import("./actions");

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

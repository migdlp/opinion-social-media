import { describe, expect, it, vi } from "vitest";
const sdk = vi.fn(() => ({ marker: "anonymous" }));
vi.mock("@supabase/supabase-js", () => ({ createClient: sdk }));
vi.mock("./env", () => ({
  getSupabaseEnv: () => ({
    url: "https://example.supabase.co",
    publishableKey: "sb_publishable_test",
  }),
}));
const { createAnonymousClient } = await import("./anonymous");
describe("cliente público sin sesión", () => {
  it("usa sólo la clave publicable, sin persistencia, refresh ni detección de sesión", () => {
    expect(createAnonymousClient()).toEqual({ marker: "anonymous" });
    expect(sdk).toHaveBeenCalledWith("https://example.supabase.co", "sb_publishable_test", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: expect.any(Function) },
    });
  });
});

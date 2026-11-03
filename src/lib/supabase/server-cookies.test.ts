import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIE_MAX_AGE } from "./cookies";

// AUTH-001: el cliente de servidor acorta la vida de las cookies de sesión que escribe el SDK.
const SDK_MAX_AGE = 400 * 24 * 60 * 60;
const store = { getAll: vi.fn(() => []), set: vi.fn() };
let requestHeaders = new Headers();
vi.mock("next/headers", () => ({
  cookies: async () => store,
  headers: async () => requestHeaders,
}));
type SetAll = (c: { name: string; value: string; options?: object }[]) => void;
let setAll: SetAll | undefined;
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_u: string, _k: string, opts: { cookies: { setAll: SetAll } }) => {
    setAll = opts.cookies.setAll;
    return {};
  },
}));
vi.mock("./env", () => ({
  getSupabaseEnv: () => ({ url: "http://localhost:54321", publishableKey: "sb_publishable_test" }),
}));

const { createClient } = await import("./server");

beforeEach(() => {
  store.set.mockReset();
  requestHeaders = new Headers();
});

describe("cliente de servidor: cookies de sesión", () => {
  it("escribe con la vida elegida, no con los 400 días del SDK", async () => {
    await createClient();
    setAll?.([
      { name: "sb-x-auth-token", value: "v", options: { path: "/", maxAge: SDK_MAX_AGE } },
    ]);
    expect(store.set).toHaveBeenCalledWith(
      "sb-x-auth-token",
      "v",
      expect.objectContaining({ maxAge: AUTH_COOKIE_MAX_AGE, path: "/" }),
    );
    expect(store.set.mock.calls[0][2].secure).toBeUndefined();
  });

  it("añade Secure cuando la petición llegó por HTTPS", async () => {
    requestHeaders = new Headers({ "x-forwarded-proto": "https" });
    await createClient();
    setAll?.([{ name: "sb-x-auth-token", value: "v", options: { maxAge: SDK_MAX_AGE } }]);
    expect(store.set.mock.calls[0][2].secure).toBe(true);
  });
});

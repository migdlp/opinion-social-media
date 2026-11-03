import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
let setAll: ((c: { name: string; value: string; options?: object }[]) => void) | undefined;
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_u: string, _k: string, opts: { cookies: { setAll: typeof setAll } }) => {
    setAll = opts.cookies.setAll;
    return { auth: { getClaims } };
  },
}));
vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => ({ url: "http://localhost:54321", publishableKey: "sb_publishable_test" }),
}));

const { proxy, config } = await import("./proxy");

beforeEach(() => {
  getClaims.mockReset();
  getClaims.mockResolvedValue({ data: null, error: null });
});

describe("proxy (renovación de sesión)", () => {
  it("renueva la sesión y copia las cookies nuevas a la respuesta", async () => {
    getClaims.mockImplementation(async () => {
      setAll?.([{ name: "sb-access-token", value: "nuevo", options: { path: "/" } }]);
      return { data: { claims: {} }, error: null };
    });

    const res = await proxy(new NextRequest("http://localhost:3000/polls/1"));

    expect(getClaims).toHaveBeenCalledOnce();
    expect(res.cookies.get("sb-access-token")?.value).toBe("nuevo");
    expect(res.status).toBe(200);
  });

  it("acorta a 30 días las cookies de sesión y marca Secure sobre HTTPS (AUTH-001)", async () => {
    getClaims.mockImplementation(async () => {
      setAll?.([
        { name: "sb-x-auth-token", value: "v", options: { path: "/", maxAge: 400 * 24 * 60 * 60 } },
      ]);
      return { data: { claims: {} }, error: null };
    });

    const res = await proxy(new NextRequest("https://opinion-social-media.vercel.app/"));

    const cookie = res.cookies.get("sb-x-auth-token");
    expect(cookie?.maxAge).toBe(30 * 24 * 60 * 60);
    expect(cookie?.secure).toBe(true);
  });

  it("sobre HTTP local no marca Secure", async () => {
    getClaims.mockImplementation(async () => {
      setAll?.([{ name: "sb-x-auth-token", value: "v", options: { maxAge: 400 * 24 * 60 * 60 } }]);
      return { data: { claims: {} }, error: null };
    });

    const res = await proxy(new NextRequest("http://localhost:3000/"));

    expect(res.cookies.get("sb-x-auth-token")?.secure).toBeFalsy();
  });

  it("si Supabase falla no rompe la página: sigue como visitante", async () => {
    getClaims.mockRejectedValue(new TypeError("fetch failed"));

    const res = await proxy(new NextRequest("http://localhost:3000/"));

    expect(res.status).toBe(200);
  });

  it("no se ejecuta sobre estáticos ni imágenes", () => {
    const [pattern] = config.matcher as string[];
    const re = new RegExp(`^${pattern}$`);
    expect(re.test("/")).toBe(true);
    expect(re.test("/polls/1")).toBe(true);
    expect(re.test("/_next/static/chunk.js")).toBe(false);
    expect(re.test("/favicon.ico")).toBe(false);
  });
});

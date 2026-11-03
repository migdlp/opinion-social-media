import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_COOKIE_MAX_AGE,
  PKCE_COOKIE_MAX_AGE,
  browserCookieAdapter,
  hardenAuthCookies,
  isSecureRequest,
} from "./cookies";

// El SDK (@supabase/ssr) fuerza maxAge = 400 días al escribir y no admite otro valor por
// `cookieOptions`: los adaptadores de cookies de la app lo reescriben (AUTH-001).
const SDK_MAX_AGE = 400 * 24 * 60 * 60;

describe("hardenAuthCookies", () => {
  it("sustituye la vida de 400 días del SDK por la elegida y respeta el resto", () => {
    const [cookie] = hardenAuthCookies(
      [
        {
          name: "sb-x-auth-token",
          value: "v",
          options: { path: "/", sameSite: "lax", maxAge: SDK_MAX_AGE },
        },
      ],
      false,
    );
    expect(cookie.options).toMatchObject({
      path: "/",
      sameSite: "lax",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });
    expect(AUTH_COOKIE_MAX_AGE).toBeLessThan(SDK_MAX_AGE);
  });

  it("no alarga el borrado: maxAge 0 se conserva", () => {
    const [cookie] = hardenAuthCookies(
      [{ name: "sb-x-auth-token", value: "", options: { maxAge: 0 } }],
      true,
    );
    expect(cookie.options?.maxAge).toBe(0);
  });

  it("marca Secure sólo sobre HTTPS", () => {
    const set = [{ name: "a", value: "v", options: { maxAge: SDK_MAX_AGE } }];
    expect(hardenAuthCookies(set, true)[0].options?.secure).toBe(true);
    expect(hardenAuthCookies(set, false)[0].options?.secure).toBeUndefined();
  });

  it("cubre los fragmentos de sesión con la misma vida", () => {
    const out = hardenAuthCookies(
      ["sb-x-auth-token.0", "sb-x-auth-token.1"].map((name) => ({
        name,
        value: "v",
        options: { maxAge: SDK_MAX_AGE },
      })),
      true,
    );
    for (const cookie of out) expect(cookie.options?.maxAge).toBe(AUTH_COOKIE_MAX_AGE);
  });

  it("el verificador PKCE de un login no terminado caduca en minutos, no en semanas", () => {
    const names = [
      "sb-x-auth-token-code-verifier",
      "sb-x-auth-token-flow-AbCdEfGh1234-code-verifier",
      "sb-x-auth-token-flows-code-verifier",
    ];
    const out = hardenAuthCookies(
      names.map((name) => ({ name, value: "v", options: { maxAge: SDK_MAX_AGE } })),
      true,
    );
    for (const cookie of out) expect(cookie.options?.maxAge).toBe(PKCE_COOKIE_MAX_AGE);
    expect(PKCE_COOKIE_MAX_AGE).toBeLessThanOrEqual(60 * 60);
  });

  it("no modifica el original", () => {
    const options = { maxAge: SDK_MAX_AGE };
    hardenAuthCookies([{ name: "a", value: "v", options }], true);
    expect(options).toEqual({ maxAge: SDK_MAX_AGE });
  });
});

describe("isSecureRequest", () => {
  it("detecta HTTPS por el protocolo de la URL o por x-forwarded-proto", () => {
    expect(isSecureRequest(new Headers(), "https://opinion-social-media.vercel.app/")).toBe(true);
    expect(isSecureRequest(new Headers(), "http://localhost:3000/")).toBe(false);
    expect(isSecureRequest(new Headers({ "x-forwarded-proto": "https" }), "http://interno/")).toBe(
      true,
    );
    expect(
      isSecureRequest(new Headers({ "x-forwarded-proto": "http" }), "http://localhost:3000/"),
    ).toBe(false);
    expect(isSecureRequest(new Headers())).toBe(false);
  });
});

describe("browserCookieAdapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubDocument(protocol: string) {
    const jar: string[] = [];
    vi.stubGlobal("location", { protocol });
    vi.stubGlobal("document", {
      get cookie() {
        return "a=1; sb-x-auth-token=abc%20d";
      },
      set cookie(value: string) {
        jar.push(value);
      },
    });
    return jar;
  }

  it("lee las cookies del documento decodificadas", () => {
    stubDocument("http:");
    expect(browserCookieAdapter().getAll()).toEqual([
      { name: "a", value: "1" },
      { name: "sb-x-auth-token", value: "abc d" },
    ]);
  });

  it("escribe con la vida acortada y Secure sobre HTTPS", () => {
    const jar = stubDocument("https:");
    browserCookieAdapter().setAll([
      {
        name: "sb-x-auth-token",
        value: "v",
        options: { path: "/", sameSite: "lax", maxAge: SDK_MAX_AGE },
      },
    ]);
    expect(jar).toHaveLength(1);
    expect(jar[0]).toContain(`Max-Age=${AUTH_COOKIE_MAX_AGE}`);
    expect(jar[0]).toContain("Secure");
    expect(jar[0]).toContain("SameSite=Lax");
    expect(jar[0]).toContain("Path=/");
  });

  it("sobre HTTP (desarrollo) no añade Secure", () => {
    const jar = stubDocument("http:");
    browserCookieAdapter().setAll([{ name: "a", value: "v", options: { maxAge: SDK_MAX_AGE } }]);
    expect(jar[0]).not.toContain("Secure");
  });
});

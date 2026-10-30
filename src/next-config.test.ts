// SEC-002: cabeceras de seguridad HTTP definidas en un único sitio (next.config.ts).
import { describe, expect, it } from "vitest";
import nextConfig, { securityHeaders } from "../next.config";

const EXPECTED: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "Content-Security-Policy-Report-Only":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://*.supabase.co; font-src 'self'; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; " +
    "form-action 'self' https://*.supabase.co https://accounts.google.com; base-uri 'self'; " +
    "object-src 'none'",
};

describe("SEC-002: cabeceras de seguridad", () => {
  it("next.config aplica una única regla a todas las rutas", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
  });

  it("incluye exactamente las cinco cabeceras con sus valores", async () => {
    const [rule] = await nextConfig.headers!();
    const actual = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
    expect(actual).toEqual(EXPECTED);
    expect(rule.headers).toHaveLength(Object.keys(EXPECTED).length);
  });

  it("exporta la misma lista que usa la regla", async () => {
    const [rule] = await nextConfig.headers!();
    expect(rule.headers).toBe(securityHeaders);
  });

  it("la CSP solo informa: no hay una Content-Security-Policy bloqueante", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).not.toContain("Content-Security-Policy");
  });

  it("no duplica HSTS, que ya envía Vercel", () => {
    const keys = securityHeaders.map((h) => h.key.toLowerCase());
    expect(keys).not.toContain("strict-transport-security");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv } from "./env";

const DEV_URL = "https://ltlrujmqenhktiilsnis.supabase.co";
const PROD_URL = "https://qchpdrolulcgmiliysvr.supabase.co";
const FAKE_SERVICE_ROLE_JWT = [
  Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url"),
  "test",
].join(".");

function setEnv(url: string | undefined, vercelEnv?: string) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", url ? "sb_publishable_test" : undefined);
  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", vercelEnv);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabaseEnv", () => {
  it("devuelve la configuración de desarrollo", () => {
    setEnv(DEV_URL);
    expect(getSupabaseEnv()).toEqual({ url: DEV_URL, publishableKey: "sb_publishable_test" });
  });

  it("rechaza producción en local y en previews", () => {
    setEnv(PROD_URL);
    expect(() => getSupabaseEnv()).toThrow(/producción/);
    setEnv(PROD_URL, "preview");
    expect(() => getSupabaseEnv()).toThrow(/producción/);
  });

  it("acepta producción sólo en el despliegue de producción", () => {
    setEnv(PROD_URL, "production");
    expect(getSupabaseEnv().url).toBe(PROD_URL);
  });

  it("exige URL y clave", () => {
    setEnv(undefined);
    expect(() => getSupabaseEnv()).toThrow(/Faltan/);
  });

  it.each([
    "sb_secret_test",
    "service_role",
    FAKE_SERVICE_ROLE_JWT,
    "una-clave-cualquiera",
    "sb_publishable_",
    "sb_publishable_   ",
  ])("rechaza claves no publicables sin incluir su valor en el error (%s)", (key) => {
    setEnv(DEV_URL, "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);

    expect(() => getSupabaseEnv()).toThrow(/clave publicable/);
    expect(() => getSupabaseEnv()).not.toThrow(key);
  });
});

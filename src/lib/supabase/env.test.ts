import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv } from "./env";

const DEV_URL = "https://ltlrujmqenhktiilsnis.supabase.co";
const PROD_URL = "https://qchpdrolulcgmiliysvr.supabase.co";

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
});

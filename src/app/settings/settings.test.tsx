// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getMyProfile = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/data/operations", () => ({ getMyProfile }));
vi.mock("@/app/profile-actions", () => ({ saveProfile: vi.fn(), savePrivacy: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { SettingsContent } = await import("./settings-content");

beforeEach(() => {
  getUser.mockReset();
  getMyProfile.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  getMyProfile.mockResolvedValue({
    ok: true,
    data: { username: "ana_23", displayName: "Ana", isPrivate: false },
  });
});
afterEach(cleanup);

describe("SettingsContent (/settings)", () => {
  it("sin sesión lleva a /login?next=/settings", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(SettingsContent()).rejects.toThrow(
      `REDIRECT:/login?next=${encodeURIComponent("/settings")}`,
    );
  });

  it("sin perfil lleva a elegir usuario y vuelve a /settings", async () => {
    getMyProfile.mockResolvedValue({ ok: true, data: null });
    await expect(SettingsContent()).rejects.toThrow(
      `REDIRECT:/onboarding?next=${encodeURIComponent("/settings")}`,
    );
  });

  it("muestra el perfil actual y el interruptor de privacidad", async () => {
    render(await SettingsContent());

    expect(screen.getByRole("heading", { level: 1, name: "Ajustes" })).toBeDefined();
    expect((screen.getByRole("textbox", { name: "Usuario" }) as HTMLInputElement).value).toBe(
      "ana_23",
    );
    expect(
      (screen.getByRole("textbox", { name: /Nombre visible/ }) as HTMLInputElement).value,
    ).toBe("Ana");
    expect(screen.getByRole("switch", { name: "Cuenta privada" })).toBeDefined();
  });

  it("si no se puede leer el perfil, muestra un error recuperable", async () => {
    getMyProfile.mockResolvedValue({ ok: false, error: "NETWORK_ERROR" });
    render(await SettingsContent());

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/settings");
  });
});

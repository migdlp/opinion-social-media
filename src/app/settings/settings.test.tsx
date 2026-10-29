// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getMyProfile = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/data/operations", () => ({ getMyProfile }));
vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));
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

  it("organiza los controles en Perfil, Apariencia, Privacidad y Cuenta", async () => {
    render(await SettingsContent());

    const names = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(names).toEqual(["Perfil", "Apariencia", "Privacidad", "Cuenta"]);
    for (const name of names) {
      expect(screen.getByRole("region", { name: name! })).toBeDefined();
    }
  });

  it("Apariencia reutiliza el selector de tema compartido", async () => {
    render(await SettingsContent());
    const appearance = screen.getByRole("region", { name: "Apariencia" });
    expect(within(appearance).getByRole("combobox", { name: "Tema" })).toBeDefined();
  });

  it("la privacidad de cuenta vive en su apartado", async () => {
    render(await SettingsContent());
    const privacy = screen.getByRole("region", { name: "Privacidad" });
    expect(within(privacy).getByRole("switch", { name: "Cuenta privada" })).toBeDefined();
  });

  it("Cuenta permite volver al perfil y cerrar sesión", async () => {
    render(await SettingsContent());
    const account = screen.getByRole("region", { name: "Cuenta" });
    expect(
      within(account).getByRole("link", { name: "Volver a mi perfil" }).getAttribute("href"),
    ).toBe("/me");
    expect(within(account).getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getMyProfile = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/data/operations", () => ({ getMyProfile }));
vi.mock("@/app/profile-actions", () => ({ saveProfile: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  useRouter: () => ({ push: vi.fn() }),
}));

const { OnboardingContent } = await import("./onboarding-content");

beforeEach(() => {
  getUser.mockReset();
  getMyProfile.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  getMyProfile.mockResolvedValue({ ok: true, data: null });
});
afterEach(cleanup);

const render_ = async (next?: string) =>
  render(await OnboardingContent({ searchParams: Promise.resolve(next ? { next } : {}) }));

describe("OnboardingContent (/onboarding)", () => {
  it("un usuario sin perfil ve el formulario para elegir @usuario", async () => {
    await render_("/polls/1");

    expect(screen.getByRole("heading", { level: 1, name: "Elige tu usuario" })).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Usuario" })).toBeDefined();
  });

  it("con perfil y sin destino se redirige a /", async () => {
    getMyProfile.mockResolvedValue({
      ok: true,
      data: { username: "ana_23", displayName: null, isPrivate: false },
    });

    await expect(render_()).rejects.toThrow(/^REDIRECT:\/$/);
  });

  it.each(["/me", "/create", "/polls/1"])(
    "con perfil recién creado conserva el retorno %s al refrescar onboarding",
    async (next) => {
      getMyProfile.mockResolvedValue({ ok: true, data: { username: "ana_23" } });
      await expect(render_(next)).rejects.toThrow(`REDIRECT:${next}`);
    },
  );

  it.each(["/onboarding", "/onboarding?next=%2Fme"])(
    "un destino de onboarding %s no crea un bucle con perfil existente",
    async (next) => {
      getMyProfile.mockResolvedValue({ ok: true, data: { username: "ana_23" } });
      await expect(render_(next)).rejects.toThrow(/^REDIRECT:\/$/);
    },
  );

  it("sin sesión se lleva al login y se vuelve al onboarding", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(render_("/polls/1")).rejects.toThrow(
      `REDIRECT:/login?next=${encodeURIComponent("/onboarding?next=%2Fpolls%2F1")}`,
    );
  });

  it("si no se puede comprobar el perfil, muestra un error recuperable", async () => {
    getMyProfile.mockResolvedValue({ ok: false, error: "NETWORK_ERROR" });

    await render_();

    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    expect(screen.getByRole("link", { name: "Reintentar" })).toBeDefined();
  });
});

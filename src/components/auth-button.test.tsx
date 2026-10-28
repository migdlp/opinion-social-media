// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let getUser: () => Promise<unknown>;
const getMyProfile = vi.fn();
vi.mock("@/lib/data/operations", () => ({ getMyProfile }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));

const { AuthButton } = await import("./auth-button");

beforeEach(() => {
  getUser = async () => ({ data: { user: null }, error: null });
  getMyProfile.mockReset();
  getMyProfile.mockResolvedValue({
    ok: true,
    data: { username: "ana_23", displayName: "Ana", isPrivate: false },
  });
});
afterEach(cleanup);

describe("AuthButton", () => {
  it("un visitante ve «Iniciar sesión», que lleva a /login", async () => {
    render(await AuthButton());

    const link = screen.getByRole("link", { name: "Iniciar sesión" });
    expect(link.getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("con sesión vigente muestra «Cerrar sesión» y no «Iniciar sesión»", async () => {
    const user = userEvent.setup();
    getUser = async () => ({ data: { user: { id: "u1", email: "a@b.c" } }, error: null });

    const { container } = render(await AuthButton());
    await user.click(screen.getByText("@ana_23").closest("summary")!);

    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(container.querySelector("form")).not.toBeNull();
    // La cabecera no expone datos personales del usuario.
    expect(container.textContent).not.toContain("a@b.c");
  });

  it("con sesión ofrece perfil, ajustes y solicitudes sin usar la foto o el nombre de Google", async () => {
    const user = userEvent.setup();
    getUser = async () => ({
      data: {
        user: { id: "u1", email: "privado@example.test", user_metadata: { name: "Privado" } },
      },
    });
    const { container } = render(await AuthButton());
    await user.click(screen.getByText("@ana_23").closest("summary")!);
    for (const [label, href] of [
      ["Mi perfil", "/me"],
      ["Ajustes", "/settings"],
      ["Solicitudes", "/solicitudes"],
    ]) {
      expect(screen.getByRole("link", { name: label }).getAttribute("href")).toBe(href);
    }
    expect(container.textContent).toContain("AN");
    expect(container.textContent).not.toContain("Privado");
    expect(container.querySelector("img")).toBeNull();
  });

  it("el menú se abre con teclado y Escape lo cierra devolviendo el foco", async () => {
    const user = userEvent.setup();
    getUser = async () => ({ data: { user: { id: "u1" } } });
    const { container } = render(await AuthButton());
    const summary = container.querySelector("summary")!;
    summary.focus();
    await user.keyboard("{Enter}");
    // jsdom no implementa la activación nativa de summary; el click reproduce su default.
    if (!container.querySelector("details")?.open) await user.click(summary);
    screen.getByRole("link", { name: "Mi perfil" }).focus();
    await user.keyboard("{Escape}");
    expect(container.querySelector("details")?.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it("sin perfil o si falla su lectura conserva la sesión y la opción de salir", async () => {
    const user = userEvent.setup();
    getUser = async () => ({ data: { user: { id: "u1" } } });
    getMyProfile.mockResolvedValue({ ok: false, error: "NETWORK_ERROR" });
    const { container } = render(await AuthButton());
    await user.click(container.querySelector("summary")!);
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Mi perfil" })).toBeDefined();
  });

  it("una sesión caducada (error de Auth) se muestra como visitante", async () => {
    getUser = async () => ({ data: { user: null }, error: { message: "JWT expired" } });

    render(await AuthButton());

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeDefined();
  });

  it("si Supabase no responde, la cabecera sigue como visitante sin romperse", async () => {
    getUser = async () => {
      throw new TypeError("fetch failed");
    };

    render(await AuthButton());

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeDefined();
  });
});

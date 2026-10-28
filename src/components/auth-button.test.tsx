// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let getUser: () => Promise<unknown>;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));

const { AuthButton } = await import("./auth-button");

beforeEach(() => {
  getUser = async () => ({ data: { user: null }, error: null });
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
    getUser = async () => ({ data: { user: { id: "u1", email: "a@b.c" } }, error: null });

    const { container } = render(await AuthButton());

    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(container.querySelector("form")).not.toBeNull();
    // La cabecera no expone datos personales del usuario.
    expect(container.textContent).not.toContain("a@b.c");
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

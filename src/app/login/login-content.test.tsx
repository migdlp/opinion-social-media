// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/google-sign-in-button", () => ({
  GoogleSignInButton: ({ next }: { next: string }) => <button data-next={next}>Google</button>,
}));

const { LoginContent } = await import("./login-content");

afterEach(cleanup);

const view = async (sp: Record<string, string | string[] | undefined>) =>
  render(await LoginContent({ searchParams: Promise.resolve(sp) }));

describe("LoginContent (/login)", () => {
  it("sin parámetros ofrece Google con retorno a / y sin avisos", async () => {
    await view({});

    expect(screen.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeDefined();
    expect(screen.getByRole("button").getAttribute("data-next")).toBe("/");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("conserva la ruta local de la que viene el visitante", async () => {
    await view({ next: "/create" });

    expect(screen.getByRole("button").getAttribute("data-next")).toBe("/create");
  });

  it("ignora un retorno externo", async () => {
    await view({ next: "https://sitio-ajeno.example/" });

    expect(screen.getByRole("button").getAttribute("data-next")).toBe("/");
  });

  it("tras un error o cancelación explica qué pasó y deja reintentar, sin detalle técnico", async () => {
    await view({ error: "auth", next: "/polls/1" });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/No se ha podido iniciar sesión/);
    expect(screen.getByRole("button").getAttribute("data-next")).toBe("/polls/1");
  });

  it("toma el primer valor si el parámetro viene repetido", async () => {
    await view({ next: ["/create", "https://ajeno.example"] });

    expect(screen.getByRole("button").getAttribute("data-next")).toBe("/create");
  });
});

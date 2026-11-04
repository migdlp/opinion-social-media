// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileNav } from "./mobile-nav";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
afterEach(cleanup);

describe("MobileNav (V2-010, SEARCH-002)", () => {
  it("con sesión enlaza Feed, Buscar, Crear y Perfil a sus destinos", () => {
    render(<MobileNav signedIn />);
    const nav = screen.getByRole("navigation", { name: "Navegación móvil" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/", "/search", "/create", "/me"]);
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Feed", "Buscar", "Crear", "Perfil"]);
  });

  it("sin sesión el acceso a Perfil solicita login y vuelve a /me", () => {
    render(<MobileNav signedIn={false} />);
    expect(screen.getByRole("link", { name: "Perfil" }).getAttribute("href")).toBe(
      "/login?next=%2Fme",
    );
  });

  it.each([
    ["/", "Feed"],
    ["/search", "Buscar"],
    ["/create", "Crear"],
    ["/me", "Perfil"],
    ["/u/ana_23", "Perfil"],
    ["/settings", "Perfil"],
    ["/solicitudes", "Perfil"],
  ])("en %s sólo marca %s como actual", (path, label) => {
    pathname = path;
    render(<MobileNav signedIn />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("aria-current")).toBe(link.textContent === label ? "page" : null);
    }
  });

  it("los cuatro enlaces tienen nombre accesible y se recorren con Tab", async () => {
    const user = userEvent.setup();
    render(<MobileNav signedIn />);
    for (const name of ["Feed", "Buscar", "Crear", "Perfil"]) {
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name }));
    }
  });
});

describe("MobileNav: Buscar (SEARCH-002)", () => {
  it("la lupa es una pestaña más: sin desbordar a 320 px (cuatro columnas) y con 44 px de alto", () => {
    pathname = "/";
    render(<MobileNav signedIn />);
    const nav = screen.getByRole("navigation", { name: "Navegación móvil" });
    expect(nav.className).toContain("grid-cols-4");
    for (const link of within(nav).getAllByRole("link")) {
      expect(link.className).toContain("min-h-12");
    }
  });

  it("Buscar no pide sesión: lleva a /search también a un visitante", () => {
    render(<MobileNav signedIn={false} />);
    expect(screen.getByRole("link", { name: "Buscar" }).getAttribute("href")).toBe("/search");
  });
});

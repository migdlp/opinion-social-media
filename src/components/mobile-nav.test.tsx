// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileNav } from "./mobile-nav";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
afterEach(cleanup);

describe("MobileNav (V2-010)", () => {
  it("con sesión enlaza Feed, Crear y Perfil a sus destinos", () => {
    render(<MobileNav signedIn />);
    const nav = screen.getByRole("navigation", { name: "Navegación móvil" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/", "/create", "/me"]);
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Feed", "Crear", "Perfil"]);
  });

  it("sin sesión el acceso a Perfil solicita login y vuelve a /me", () => {
    render(<MobileNav signedIn={false} />);
    expect(screen.getByRole("link", { name: "Perfil" }).getAttribute("href")).toBe(
      "/login?next=%2Fme",
    );
  });

  it.each([
    ["/", "Feed"],
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

  it("los tres enlaces tienen nombre accesible y se recorren con Tab", async () => {
    const user = userEvent.setup();
    render(<MobileNav signedIn />);
    for (const name of ["Feed", "Crear", "Perfil"]) {
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name }));
    }
  });
});

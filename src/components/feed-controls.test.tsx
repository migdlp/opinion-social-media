// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedControls } from "./feed-controls";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const categories = [
  { slug: "deportes", name: "Deportes" },
  { slug: "otros", name: "Otros" },
];

describe("categorías compactas", () => {
  it("permite recorrer todas las categorías con flechas, Inicio y Fin sin navegar", async () => {
    render(<FeedControls mode="recientes" category={null} categories={categories} signedIn />);
    const links = within(screen.getByRole("navigation", { name: "Categorías" })).getAllByRole(
      "link",
    );
    links[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(links[1]);
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(links[2]);
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(links[1]);
    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(links[0]);
  });

  it("hace visible la categoría activa al cargar sin desplazar verticalmente la página", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const left = this.textContent === "Otros" ? 350 : 0;
      return {
        left,
        right: left + 180,
        top: 100,
        bottom: 144,
        width: 180,
        height: 44,
        x: left,
        y: 100,
        toJSON() {},
      };
    });
    render(<FeedControls mode="recientes" category="otros" categories={categories} signedIn />);
    expect(screen.getByRole("navigation", { name: "Categorías" }).scrollLeft).toBeGreaterThan(0);
  });

  it("conserva URL y selección; Siguiendo del visitante vuelve al mismo filtro tras login", () => {
    render(
      <FeedControls mode="recientes" category="otros" categories={categories} signedIn={false} />,
    );
    expect(screen.getByRole("link", { name: "Otros" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Todas" }).getAttribute("href")).toBe(
      "/?tab=recientes",
    );
    expect(screen.getByRole("link", { name: "Siguiendo" }).getAttribute("href")).toBe(
      "/login?next=%2F%3Ftab%3Dsiguiendo%26categoria%3Dotros",
    );
  });
});

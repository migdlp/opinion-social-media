// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Avatar, avatarTone, initialsOf } from "./avatar";

afterEach(cleanup);

describe("initialsOf", () => {
  it.each([
    ["ana_23", null, "AN"],
    ["ana_23", "Ana María", "AM"],
    ["ana_23", "  beto  ", "BE"],
    ["x_y", "Carlos de la Cruz", "CC"],
    ["zeta", "ñandú", "ÑA"],
  ])("%s / %s → %s", (username, display, expected) => {
    expect(initialsOf(username, display)).toBe(expected);
  });
});

describe("avatarTone", () => {
  it("es estable para un mismo usuario y distinto entre usuarios", () => {
    expect(avatarTone("ana_23")).toEqual(avatarTone("ana_23"));
    const tones = new Set(
      ["ana_23", "beto", "carla", "dani", "eva", "fran"].map((u) => avatarTone(u).background),
    );
    expect(tones.size).toBeGreaterThan(2);
  });

  it("siempre deja contraste suficiente entre fondo y texto (grises)", () => {
    for (const u of ["a", "bb", "ccc", "ana_23", "zzzz", "moderacion"]) {
      const { background, color } = avatarTone(u);
      const lightness = Number(/hsl\(0 0% (\d+)%\)/.exec(background)![1]);
      expect(lightness).toBeGreaterThanOrEqual(18);
      expect(lightness).toBeLessThanOrEqual(42);
      expect(color).toBe("#ffffff");
    }
  });
});

describe("Avatar", () => {
  it("muestra las iniciales y es decorativo (el nombre ya está en el texto)", () => {
    render(<Avatar username="ana_23" displayName="Ana María" />);
    const el = screen.getByText("AM");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("con icono dibuja el trazo del catálogo en lugar de las iniciales, también decorativo", () => {
    const { container } = render(<Avatar username="ana_23" displayName="Ana María" icon="sol" />);
    const el = container.querySelector('[data-avatar-icon="sol"]')!;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.querySelector("svg path")).not.toBeNull();
    expect(screen.queryByText("AM")).toBeNull();
  });

  it("sin icono o con valor desconocido usa las iniciales", () => {
    const { container, rerender } = render(<Avatar username="ana_23" icon={null} />);
    expect(screen.getByText("AN")).toBeDefined();
    rerender(<Avatar username="ana_23" icon={"otro" as never} />);
    expect(screen.getByText("AN")).toBeDefined();
    expect(container.querySelector("[data-avatar-icon]")).toBeNull();
  });
});

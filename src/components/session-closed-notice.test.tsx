// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionClosedNotice } from "./session-closed-notice";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("SessionClosedNotice (AUTH-002)", () => {
  it("anuncia el cierre en todos los dispositivos y quita ?sesion=cerrada de la URL", () => {
    window.history.replaceState(null, "", "/?sesion=cerrada&tab=recientes");
    render(<SessionClosedNotice />);
    expect(screen.getByRole("status").textContent).toBe(
      "Has cerrado la sesión en todos tus dispositivos.",
    );
    expect(window.location.search).toBe("?tab=recientes");
  });

  it("sin otros parámetros deja la URL en /", () => {
    window.history.replaceState(null, "", "/?sesion=cerrada");
    render(<SessionClosedNotice />);
    expect(window.location.pathname + window.location.search).toBe("/");
  });
});

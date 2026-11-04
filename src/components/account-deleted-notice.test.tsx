// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AccountDeletedNotice } from "./account-deleted-notice";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("AccountDeletedNotice (ACCOUNT-002)", () => {
  it("anuncia «Tu cuenta se ha eliminado.» y quita ?cuenta=eliminada de la URL", () => {
    window.history.replaceState(null, "", "/?cuenta=eliminada&tab=recientes");
    render(<AccountDeletedNotice />);
    expect(screen.getByRole("status").textContent).toBe("Tu cuenta se ha eliminado.");
    expect(window.location.search).toBe("?tab=recientes");
  });

  it("sin otros parámetros deja la URL en /", () => {
    window.history.replaceState(null, "", "/?cuenta=eliminada");
    render(<AccountDeletedNotice />);
    expect(window.location.pathname + window.location.search).toBe("/");
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { PrivacyToggle } from "./privacy-toggle";

afterEach(cleanup);

const OK: Result<null> = { ok: true, data: null };
const setup = (isPrivate: boolean, onChange = vi.fn(async (): Promise<Result<null>> => OK)) => {
  render(<PrivacyToggle isPrivate={isPrivate} onChange={onChange} />);
  return onChange;
};
const toggle = () => screen.getByRole("switch", { name: "Cuenta privada" });

describe("PrivacyToggle", () => {
  it("refleja el estado actual", () => {
    setup(true);
    expect(toggle().getAttribute("aria-checked")).toBe("true");
  });

  it("al activarla pide confirmar con el texto de D-017 y no guarda hasta confirmar", async () => {
    const onChange = setup(false);
    await userEvent.click(toggle());

    expect(
      screen.getByText(
        "Tus encuestas y votos sólo los verán tus seguidores. Las personas que ya te siguen seguirán haciéndolo.",
      ),
    ).toBeDefined();
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Hacer privada" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("cancelar la confirmación no cambia nada", async () => {
    const onChange = setup(false);
    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Hacer privada" })).toBeNull();
    expect(toggle().getAttribute("aria-checked")).toBe("false");
  });

  it("pasar a pública guarda directamente", async () => {
    const onChange = setup(true);
    await userEvent.click(toggle());

    expect(onChange).toHaveBeenCalledWith(false);
    expect(toggle().getAttribute("aria-checked")).toBe("false");
  });

  it("explica que al volver a pública se aceptan las solicitudes pendientes", () => {
    setup(true);
    expect(screen.getByText(/solicitudes pendientes/)).toBeDefined();
  });

  it("si falla, mantiene el estado anterior y avisa", async () => {
    setup(
      true,
      vi.fn(async (): Promise<Result<null>> => ({ ok: false, error: "NETWORK_ERROR" })),
    );
    await userEvent.click(toggle());

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(toggle().getAttribute("aria-checked")).toBe("true");
  });
});

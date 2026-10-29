// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result, VoteVisibility } from "@/lib/data/types";
import { VoteVisibilityPicker } from "./vote-visibility-picker";

afterEach(cleanup);

const OK: Result<void> = { ok: true, data: undefined };
const setup = (
  value: VoteVisibility = "private",
  onChange = vi.fn(async (): Promise<Result<void>> => OK),
) => {
  render(<VoteVisibilityPicker value={value} onChange={onChange} />);
  return onChange;
};
const radio = (name: string) => screen.getByRole("radio", { name: new RegExp(name) });

describe("VoteVisibilityPicker", () => {
  it("es un grupo etiquetado con las tres audiencias y marca la guardada", () => {
    setup("followers");
    expect(
      screen.getByRole("radiogroup", { name: "Quién puede ver las encuestas que votas" }),
    ).toBeDefined();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect((radio("Seguidores aceptados") as HTMLInputElement).checked).toBe(true);
    expect((radio("Solo yo") as HTMLInputElement).checked).toBe(false);
  });

  it("explica quién ve la actividad en cada caso", () => {
    setup();
    expect(screen.getByText(/Nadie más ve qué encuestas has votado ni tu opción/)).toBeDefined();
    expect(screen.getByText(/sólo quienes te siguen y has aceptado/i)).toBeDefined();
    expect(screen.getByText(/Según la privacidad de la cuenta/)).toBeDefined();
  });

  it("aclara que ocultar el historial no retira votos ni cambia los agregados", () => {
    setup();
    expect(
      screen.getByText(/no retira tus votos ni cambia los resultados agregados y anónimos/),
    ).toBeDefined();
  });

  it("al elegir otra opción la guarda y confirma", async () => {
    const onChange = setup("private");
    await userEvent.click(radio("Seguidores aceptados"));

    expect(onChange).toHaveBeenCalledWith("followers");
    expect((radio("Seguidores aceptados") as HTMLInputElement).checked).toBe(true);
    expect(await screen.findByText("Audiencia guardada.")).toBeDefined();
  });

  it("marca la opción al instante mientras guarda y la revierte si falla", async () => {
    let finish: (result: Result<void>) => void = () => {};
    const onChange = vi.fn(() => new Promise<Result<void>>((resolve) => (finish = resolve)));
    setup("private", onChange);
    await userEvent.click(radio("Seguidores aceptados"));

    expect((radio("Seguidores aceptados") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText("Audiencia guardada.")).toBeNull();

    finish({ ok: false, error: "NETWORK_ERROR" });
    expect(await screen.findByRole("alert")).toBeDefined();
    expect((radio("Solo yo") as HTMLInputElement).checked).toBe(true);
    expect((radio("Seguidores aceptados") as HTMLInputElement).checked).toBe(false);
  });

  it("elegir la ya guardada no llama al servidor", async () => {
    const onChange = setup("private");
    await userEvent.click(radio("Solo yo"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("si falla, conserva el valor anterior y muestra un mensaje recuperable", async () => {
    setup(
      "private",
      vi.fn(async (): Promise<Result<void>> => ({ ok: false, error: "NETWORK_ERROR" })),
    );
    await userEvent.click(radio("Según la privacidad"));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect((radio("Solo yo") as HTMLInputElement).checked).toBe(true);
    expect((radio("Según la privacidad") as HTMLInputElement).checked).toBe(false);
  });

  it("es operable con teclado", async () => {
    const onChange = setup("private");
    radio("Solo yo").focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenCalledWith("followers");
  });
});

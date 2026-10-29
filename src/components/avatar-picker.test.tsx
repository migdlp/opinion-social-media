// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AVATAR_ICONS, type AvatarIcon } from "@/lib/avatar-icons";
import type { Result } from "@/lib/data/types";
import { AvatarPicker } from "./avatar-picker";

afterEach(cleanup);

const OK: Result<void> = { ok: true, data: undefined };
const setup = (
  value: AvatarIcon | null = null,
  onChange = vi.fn(async (): Promise<Result<void>> => OK),
) => {
  const view = render(
    <AvatarPicker username="ana_23" displayName="Ana María" value={value} onChange={onChange} />,
  );
  return { onChange, ...view };
};
const radio = (name: string) => screen.getByRole("radio", { name }) as HTMLInputElement;

describe("AvatarPicker", () => {
  it("es un grupo etiquetado con Iniciales y todo el catálogo, con nombre accesible", () => {
    setup();
    expect(screen.getByRole("radiogroup", { name: "Imagen de perfil" })).toBeDefined();
    expect(screen.getAllByRole("radio")).toHaveLength(AVATAR_ICONS.length + 1);
    expect(radio("Iniciales").checked).toBe(true);
    for (const icon of AVATAR_ICONS) expect(radio(icon.label)).toBeDefined();
  });

  it("marca el icono guardado y lo enseña en la vista previa", () => {
    const { container } = setup("estrella");
    expect(radio("Estrella").checked).toBe(true);
    expect(radio("Iniciales").checked).toBe(false);
    expect(
      container.querySelector('[data-testid="avatar-preview"] [data-avatar-icon="estrella"]'),
    ).not.toBeNull();
  });

  it("la vista previa usa las iniciales cuando no hay icono", () => {
    const { container } = setup(null);
    const preview = container.querySelector('[data-testid="avatar-preview"]')!;
    expect(preview.textContent).toContain("AM");
  });

  it("al elegir un icono lo marca al instante, lo guarda y confirma", async () => {
    const { onChange } = setup(null);
    await userEvent.click(radio("Sol"));

    expect(onChange).toHaveBeenCalledWith("sol");
    expect(radio("Sol").checked).toBe(true);
    expect(await screen.findByText("Imagen guardada.")).toBeDefined();
  });

  it("restablecer a iniciales guarda null", async () => {
    const { onChange } = setup("luna");
    await userEvent.click(radio("Iniciales"));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(radio("Iniciales").checked).toBe(true);
  });

  it("elegir la ya guardada no llama al servidor", async () => {
    const { onChange } = setup("luna");
    await userEvent.click(radio("Luna"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("si falla, vuelve a la elección anterior con un mensaje recuperable", async () => {
    setup(
      "luna",
      vi.fn(async (): Promise<Result<void>> => ({ ok: false, error: "AVATAR_INVALID" })),
    );
    await userEvent.click(radio("Sol"));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(radio("Luna").checked).toBe(true);
    expect(radio("Sol").checked).toBe(false);
  });

  it("ancla cada radio oculto a su etiqueta para que enfocarlo no desplace la página", () => {
    setup();
    for (const input of screen.getAllByRole("radio")) {
      expect(input.className).toContain("sr-only");
      expect(input.closest("label")!.className).toMatch(/(^|\s)relative(\s|$)/);
    }
  });

  it("es operable con teclado", async () => {
    const { onChange } = setup(null);
    radio("Iniciales").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("sol");
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { SignOutEverywhere } from "./sign-out-everywhere";

type Act = () => Promise<Result<void>>;
const never = (): Promise<Result<void>> => new Promise(() => {});

// jsdom no implementa <dialog>: se simula lo que importa (open, showModal, close y su evento).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(cleanup);

const TRIGGER = "Cerrar sesión en todos los dispositivos";

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: TRIGGER }));
  return screen.getByRole("alertdialog", { name: TRIGGER });
}

describe("SignOutEverywhere (AUTH-002)", () => {
  it("muestra el apartado Sesiones con su texto y el ancla #sesiones", () => {
    render(<SignOutEverywhere onSignOut={never} />);
    const section = screen.getByRole("region", { name: "Sesiones" });
    expect(section.id).toBe("sesiones");
    expect(section.textContent).toContain(
      "Cierra tu sesión aquí y en cualquier otro dispositivo donde hayas entrado.",
    );
    expect(screen.getByRole("button", { name: TRIGGER })).toBeTruthy();
  });

  it("el botón abre un alertdialog con el aviso y no cierra nada todavía", async () => {
    const onSignOut = vi.fn<Act>(never);
    render(<SignOutEverywhere onSignOut={onSignOut} />);
    const dialog = await openDialog();
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.textContent).toContain(
      "Se cerrará tu sesión en todos tus dispositivos. En los demás puede tardar hasta una hora en hacerse efectivo.",
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar todas" })).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" })),
    );
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("«Cancelar» no hace nada y devuelve el foco al botón", async () => {
    const onSignOut = vi.fn<Act>(never);
    render(<SignOutEverywhere onSignOut={onSignOut} />);
    const trigger = screen.getByRole("button", { name: TRIGGER });
    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("«Cerrar todas» llama a la acción una sola vez y muestra «Cerrando…»", async () => {
    const onSignOut = vi.fn<Act>(never);
    render(<SignOutEverywhere onSignOut={onSignOut} />);
    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar todas" }));
    expect(onSignOut).toHaveBeenCalledOnce();
    const busy = screen.getByRole("button", { name: "Cerrando…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    await userEvent.click(busy);
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("un error se muestra dentro del diálogo, que sigue abierto y permite reintentar", async () => {
    const onSignOut = vi.fn<Act>(async () => ({ ok: false, error: "UNKNOWN" }));
    render(<SignOutEverywhere onSignOut={onSignOut} />);
    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar todas" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Algo ha fallado. Vuelve a intentarlo.");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Cerrar todas" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("si la acción lanza (sin red) se muestra el error de red", async () => {
    const onSignOut = vi.fn<Act>(async () => {
      throw new TypeError("fetch failed");
    });
    render(<SignOutEverywhere onSignOut={onSignOut} />);
    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar todas" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/conexión/i);
  });

  it("al volver a abrir el diálogo se borra el error anterior", async () => {
    const onSignOut = vi.fn<Act>(async () => ({ ok: false, error: "UNKNOWN" }));
    render(<SignOutEverywhere onSignOut={onSignOut} />);
    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar todas" }));
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await openDialog();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { DeleteAccount } from "./delete-account";

type Act = (confirm: string) => Promise<Result<void>>;
type Reconcile = () => Promise<Result<void>>;
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

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
  return screen.getByRole("alertdialog", { name: "Eliminar tu cuenta para siempre" });
}

describe("DeleteAccount (ACCOUNT-002)", () => {
  it("muestra el apartado con su texto, el ancla #eliminar y el enlace a la descarga", () => {
    render(<DeleteAccount username="ana_23" onDelete={never} onReconcile={never} />);
    const section = screen.getByRole("region", { name: "Eliminar cuenta" });
    expect(section.id).toBe("eliminar");
    expect(section.textContent).toContain(
      "Se borrarán tu perfil, tus encuestas, tus votos, tus comentarios y tus relaciones. No se puede deshacer. Tu @usuario no estará disponible para nadie durante 30 días.",
    );
    const link = screen.getByRole("link", { name: "Antes, descarga una copia de tus datos" });
    expect(link.getAttribute("href")).toBe("#descargar");
  });

  it("el botón abre un alertdialog con el foco en el campo y no borra nada todavía", async () => {
    const onDelete = vi.fn<Act>(never);
    render(<DeleteAccount username="ana_23" onDelete={onDelete} onReconcile={never} />);
    const dialog = await openDialog();
    const field = screen.getByLabelText("Escribe tu usuario (ana_23) para confirmar");
    await waitFor(() => expect(document.activeElement).toBe(field));
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("«Eliminar definitivamente» sólo se activa con el @usuario, sin distinguir mayúsculas", async () => {
    render(<DeleteAccount username="ana_23" onDelete={never} onReconcile={never} />);
    await openDialog();
    const confirm = screen.getByRole("button", { name: "Eliminar definitivamente" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    const field = screen.getByLabelText("Escribe tu usuario (ana_23) para confirmar");
    await userEvent.type(field, "ana_2");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(field, "3");
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    await userEvent.clear(field);
    await userEvent.type(field, "ANA_23");
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    await userEvent.type(field, " ");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    await userEvent.clear(field);
    await userEvent.type(field, "eliminar");
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
  });

  it("sin perfil se confirma escribiendo ELIMINAR", async () => {
    const onDelete = vi.fn<Act>(never);
    render(<DeleteAccount username={null} onDelete={onDelete} onReconcile={never} />);
    await openDialog();
    const field = screen.getByLabelText("Escribe ELIMINAR para confirmar");
    await userEvent.type(field, "eliminar");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith("eliminar");
  });

  it("confirmar llama a la acción con lo escrito y muestra «Eliminando…» mientras tanto", async () => {
    const onDelete = vi.fn<Act>(never);
    render(<DeleteAccount username="ana_23" onDelete={onDelete} onReconcile={never} />);
    await openDialog();
    await userEvent.type(
      screen.getByLabelText("Escribe tu usuario (ana_23) para confirmar"),
      "Ana_23",
    );
    await userEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith("Ana_23");
    expect(screen.getByRole("button", { name: "Eliminando…" })).toBeTruthy();
  });

  it("Cancelar cierra sin llamar a la acción y devuelve el foco al botón", async () => {
    const onDelete = vi.fn<Act>(never);
    render(<DeleteAccount username="ana_23" onDelete={onDelete} onReconcile={never} />);
    const trigger = screen.getByRole("button", { name: "Eliminar mi cuenta" });
    await openDialog();
    await userEvent.type(screen.getByLabelText(/Escribe tu usuario/), "ana_23");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("un error se muestra dentro del diálogo, que sigue abierto", async () => {
    const onDelete = vi.fn<Act>(async () => ({ ok: false, error: "CONFIRMATION_MISMATCH" }));
    render(<DeleteAccount username="ana_23" onDelete={onDelete} onReconcile={never} />);
    await openDialog();
    await userEvent.type(screen.getByLabelText(/Escribe tu usuario/), "ana_23");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Escribe exactamente tu usuario para confirmar.");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Eliminar definitivamente" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("ante NETWORK_ERROR reconcilia: si la cuenta ya no existe, la acción de reconciliar redirige", async () => {
    const onDelete = vi.fn<Act>(async () => ({ ok: false, error: "NETWORK_ERROR" }));
    const onReconcile = vi.fn<Reconcile>(never);
    render(<DeleteAccount username="ana_23" onDelete={onDelete} onReconcile={onReconcile} />);
    await openDialog();
    await userEvent.type(screen.getByLabelText(/Escribe tu usuario/), "ana_23");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    await waitFor(() => expect(onReconcile).toHaveBeenCalledOnce());
  });

  it("si al reconciliar la cuenta sigue existiendo, se muestra el error de red", async () => {
    const onDelete = vi.fn<Act>(async () => {
      throw new TypeError("fetch failed");
    });
    const onReconcile = vi.fn<Reconcile>(async () => ({ ok: false, error: "NETWORK_ERROR" }));
    render(<DeleteAccount username="ana_23" onDelete={onDelete} onReconcile={onReconcile} />);
    await openDialog();
    await userEvent.type(screen.getByLabelText(/Escribe tu usuario/), "ana_23");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/conexión/i);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});

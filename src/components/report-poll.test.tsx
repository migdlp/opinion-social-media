// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";

const submitReport =
  vi.fn<(pollId: string, reason: string, details?: string) => Promise<Result<void>>>();
vi.mock("@/app/report-actions", () => ({ submitReport }));

const { ReportPoll } = await import("./report-poll");

// jsdom no implementa <dialog>.showModal(); se imita lo que hace un navegador al abrir y cerrar.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  submitReport.mockReset();
  submitReport.mockResolvedValue({ ok: true, data: undefined });
});
afterEach(cleanup);

const ID = "11111111-2222-4333-8444-555555555555";
const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "Denunciar" }));
};

describe("ReportPoll", () => {
  it("el menú «⋯» ofrece «Denunciar» y se cierra con Escape devolviendo el foco", async () => {
    render(<ReportPoll pollId={ID} signedIn />);
    const trigger = screen.getByRole("button", { name: "Más acciones" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menuitem", { name: "Denunciar" })).toBeDefined();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Denunciar" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("un visitante va al login y vuelve a la encuesta", async () => {
    render(<ReportPoll pollId={ID} signedIn={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));

    const link = screen.getByRole("menuitem", { name: "Denunciar" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent(`/polls/${ID}`)}`);
  });

  it("con sesión abre un diálogo con los motivos y un texto opcional", async () => {
    render(<ReportPoll pollId={ID} signedIn />);
    await open();

    const dialog = screen.getByRole("dialog", { name: "Denunciar encuesta" });
    expect(dialog).toBeDefined();
    expect(screen.getAllByRole("radio").map((r) => r.closest("label")?.textContent)).toEqual([
      "Spam",
      "Odio o discriminación",
      "Acoso",
      "Contenido sexual",
      "Violencia",
      "Otro",
    ]);
    expect(screen.getByRole("textbox", { name: /Detalles/ })).toBeDefined();
  });

  it.each([null, "Otro"])(
    "Tab y Mayús+Tab permanecen en el diálogo (motivo %s)",
    async (reason) => {
      const user = userEvent.setup();
      render(<ReportPoll pollId={ID} signedIn />);
      await open();
      if (reason) await user.click(screen.getByRole("radio", { name: reason }));
      const first = screen.getByRole("radio", { name: reason ?? "Spam" });
      const last = screen.getByRole("button", { name: "Cancelar" });
      last.focus();
      await user.tab();
      expect(document.activeElement).toBe(first);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(last);
    },
  );

  it("al confirmar enfoca Cerrar y mantiene el foco hasta cerrar el diálogo", async () => {
    const user = userEvent.setup();
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await user.click(screen.getByRole("radio", { name: "Spam" }));
    await user.click(screen.getByRole("button", { name: "Enviar denuncia" }));
    const close = await screen.findByRole("button", { name: "Cerrar" });
    await waitFor(() => expect(document.activeElement).toBe(close));
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(close);
    await user.click(close);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Más acciones" }));
  });

  it("no envía sin motivo", async () => {
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));

    expect(submitReport).not.toHaveBeenCalled();
    expect(screen.getByText("Elige un motivo.")).toBeDefined();
  });

  it("envía motivo y detalle y da las gracias", async () => {
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "Spam" }));
    await userEvent.type(screen.getByRole("textbox", { name: /Detalles/ }), "  Es publicidad ");
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));

    await screen.findByText("Gracias, lo revisaremos.");
    expect(submitReport).toHaveBeenCalledOnce();
    expect(submitReport).toHaveBeenCalledWith(ID, "spam", "Es publicidad");
  });

  it("sin detalle envía sólo el motivo", async () => {
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "Otro" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));

    await screen.findByText("Gracias, lo revisaremos.");
    expect(submitReport).toHaveBeenCalledWith(ID, "otro", undefined);
  });

  it.each([
    ["ALREADY_REPORTED", "Ya has denunciado esta encuesta."],
    ["REPORT_RATE_LIMITED", "Has enviado demasiadas denuncias. Inténtalo más tarde."],
    ["NETWORK_ERROR", "No hay conexión. Comprueba tu red y vuelve a intentarlo."],
  ] as const)("si falla con %s lo explica sin cerrar el diálogo", async (code, message) => {
    submitReport.mockResolvedValue({ ok: false, error: code });
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "Acoso" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));

    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(screen.getByRole("dialog", { name: "Denunciar encuesta" })).toBeDefined();
  });

  it("si la sesión caducó ofrece iniciar sesión", async () => {
    submitReport.mockResolvedValue({ ok: false, error: "AUTH_REQUIRED" });
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "Acoso" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));

    const link = await screen.findByRole("link", { name: "Iniciar sesión" });
    expect(link.getAttribute("href")).toContain("/login?next=");
  });

  it("un solo envío a la vez", async () => {
    let resolve!: (r: Result<void>) => void;
    submitReport.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "Spam" }));
    const send = screen.getByRole("button", { name: "Enviar denuncia" });
    await userEvent.click(send);
    await userEvent.click(screen.getByRole("button", { name: "Enviando…" }));

    expect(submitReport).toHaveBeenCalledOnce();
    resolve({ ok: true, data: undefined });
    await waitFor(() => expect(screen.getByText("Gracias, lo revisaremos.")).toBeDefined());
  });

  it("Cancelar cierra el diálogo y devuelve el foco al botón del menú", async () => {
    render(<ReportPoll pollId={ID} signedIn />);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Más acciones" }));
  });
});

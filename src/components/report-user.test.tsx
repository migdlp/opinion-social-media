// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";

const submitUserReport =
  vi.fn<(username: string, reason: string, details?: string) => Promise<Result<void>>>();
vi.mock("@/app/report-actions", () => ({ submitUserReport }));

const { ReportUser } = await import("./report-user");

// jsdom no implementa <dialog>.showModal(); se imita lo que hace un navegador.
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
  submitUserReport.mockReset();
  submitUserReport.mockResolvedValue({ ok: true, data: undefined });
});
afterEach(cleanup);

const open = () => userEvent.click(screen.getByRole("button", { name: "Denunciar persona" }));

describe("ReportUser (MOD-002)", () => {
  it("un visitante va al login y vuelve al perfil", () => {
    render(<ReportUser username="ana" signedIn={false} />);
    const link = screen.getByRole("link", { name: "Denunciar persona" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/u/ana")}`);
  });

  it("el diálogo identifica a la persona, no a una encuesta, y no envía sin confirmar", async () => {
    render(<ReportUser username="ana" signedIn />);
    await open();
    expect(screen.getByRole("heading", { name: "Denunciar a @ana" })).toBeDefined();
    expect(screen.getByText(/esto denuncia a la persona, no a una encuesta/i)).toBeDefined();
    expect(screen.getByText(/no la bloquea/i)).toBeDefined();
    expect(submitUserReport).not.toHaveBeenCalled();
  });

  it("exige un motivo antes de enviar", async () => {
    render(<ReportUser username="ana" signedIn />);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));
    expect(screen.getByText("Elige un motivo.")).toBeDefined();
    expect(submitUserReport).not.toHaveBeenCalled();
  });

  it("envía una sola vez con el motivo y el detalle recortado, y confirma", async () => {
    render(<ReportUser username="ana" signedIn />);
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "Acoso" }));
    await userEvent.type(screen.getByLabelText(/detalles/i), "  me insulta  ");
    const send = screen.getByRole("button", { name: "Enviar denuncia" });
    await userEvent.dblClick(send);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/gracias/i));
    expect(submitUserReport).toHaveBeenCalledOnce();
    expect(submitUserReport).toHaveBeenCalledWith("ana", "acoso", "me insulta");
  });

  it.each([
    ["ALREADY_REPORTED", /ya has denunciado a esta persona/i],
    ["REPORT_RATE_LIMITED", /demasiadas denuncias/i],
    ["NETWORK_ERROR", /conexión/i],
  ] as const)("%s se explica sin datos internos", async (code, text) => {
    submitUserReport.mockResolvedValue({ ok: false, error: code });
    render(<ReportUser username="ana" signedIn />);
    await open();
    await userEvent.click(screen.getByRole("radio", { name: "Spam" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(text);
  });

  it("Cancelar y Escape cierran sin enviar y devuelven el foco al botón", async () => {
    render(<ReportUser username="ana" signedIn />);
    const trigger = screen.getByRole("button", { name: "Denunciar persona" });
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(document.activeElement).toBe(trigger);
    expect(submitUserReport).not.toHaveBeenCalled();
  });
});

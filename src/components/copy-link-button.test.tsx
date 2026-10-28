// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./copy-link-button";

const ID = "11111111-2222-4333-8444-555555555555";
const url = () => `${window.location.origin}/polls/${ID}`;

function mockClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

function mockShare(share: ((data: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
}

afterEach(() => {
  cleanup();
  mockClipboard(undefined);
  mockShare(undefined);
});

describe("CopyLinkButton", () => {
  it("copia la URL pública absoluta de la encuesta y lo confirma", async () => {
    const writeText = vi.fn(async () => {});
    mockClipboard(writeText);
    render(<CopyLinkButton path={`/polls/${ID}`} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    await screen.findByText("Enlace copiado");
    expect(screen.getByRole("status").textContent).toBe("Enlace copiado");
    expect(writeText).toHaveBeenCalledWith(url());
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("con el permiso denegado, ofrece el enlace seleccionado para copiarlo a mano", async () => {
    mockClipboard(vi.fn(async () => Promise.reject(new DOMException("denied", "NotAllowedError"))));
    render(<CopyLinkButton path={`/polls/${ID}`} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    const field = (await screen.findByRole("textbox", {
      name: "Enlace de la encuesta",
    })) as HTMLInputElement;
    expect(field.value).toBe(url());
    expect(field.readOnly).toBe(true);
    // El foco se mueve al campo tras renderizarlo: en CI llegaba a veces un instante después.
    await waitFor(() => expect(document.activeElement).toBe(field));
    expect(screen.getByRole("status").textContent).toBe(
      "No se ha podido copiar. Selecciona el enlace y cópialo.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sin API de portapapeles (contexto no seguro), muestra la misma alternativa", async () => {
    mockClipboard(undefined);
    render(<CopyLinkButton path={`/polls/${ID}`} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    const field = (await screen.findByRole("textbox", {
      name: "Enlace de la encuesta",
    })) as HTMLInputElement;
    expect(field.value).toBe(url());
  });

  describe("hoja nativa de compartir (V2-018)", () => {
    const QUESTION = "¿Tortilla con o sin cebolla?";

    it("con navigator.share ofrece «Compartir» y comparte título y URL, nunca resultados", async () => {
      const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {});
      mockShare(share);
      render(<CopyLinkButton path={`/polls/${ID}`} title={QUESTION} />);

      fireEvent.click(await screen.findByRole("button", { name: "Compartir" }));

      await waitFor(() => expect(share).toHaveBeenCalledOnce());
      expect(share).toHaveBeenCalledWith({ title: QUESTION, url: url() });
      expect(screen.queryByRole("button", { name: "Copiar enlace" })).toBeNull();
    });

    it("si el usuario cancela la hoja no aparece ningún error ni mensaje", async () => {
      mockShare(vi.fn(async () => Promise.reject(new DOMException("cancel", "AbortError"))));
      mockClipboard(vi.fn(async () => {}));
      render(<CopyLinkButton path={`/polls/${ID}`} title={QUESTION} />);

      fireEvent.click(await screen.findByRole("button", { name: "Compartir" }));

      await waitFor(() => expect(navigator.share).toHaveBeenCalled());
      expect(screen.getByRole("status").textContent).toBe("");
      expect(screen.queryByRole("alert")).toBeNull();
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it("si la hoja falla por otro motivo, copia el enlace y lo confirma", async () => {
      mockShare(vi.fn(async () => Promise.reject(new Error("no disponible"))));
      const writeText = vi.fn(async () => {});
      mockClipboard(writeText);
      render(<CopyLinkButton path={`/polls/${ID}`} title={QUESTION} />);

      fireEvent.click(await screen.findByRole("button", { name: "Compartir" }));

      await screen.findByText("Enlace copiado");
      expect(writeText).toHaveBeenCalledWith(url());
    });

    it("sin navigator.share sigue copiando el enlace", async () => {
      mockClipboard(vi.fn(async () => {}));
      render(<CopyLinkButton path={`/polls/${ID}`} title={QUESTION} />);

      fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

      await screen.findByText("Enlace copiado");
    });
  });
});

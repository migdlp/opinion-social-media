// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
  mockClipboard(undefined);
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
    expect(document.activeElement).toBe(field);
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
});

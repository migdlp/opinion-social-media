// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { DownloadData } from "./download-data";

type File = { filename: string; content: string };
const file: File = { filename: "opinion-datos-2026-11-04.json", content: '{\n  "version": 1\n}' };
const createObjectURL = vi.fn(() => "blob:test");
const revokeObjectURL = vi.fn();
let clicked: { download: string; href: string }[] = [];

beforeEach(() => {
  clicked = [];
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push({ download: this.download, href: this.href });
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe("DownloadData (ACCOUNT-003)", () => {
  it("explica qué se descarga y tiene el ancla #descargar", () => {
    render(<DownloadData onExport={async () => ({ ok: true, data: file })} />);
    expect(screen.getByRole("region", { name: "Descargar mis datos" }).id).toBe("descargar");
    expect(
      screen.getByText(
        "Recibirás un archivo JSON con tu perfil, encuestas, votos, comentarios, relaciones, ajustes y denuncias.",
      ),
    ).toBeTruthy();
  });

  it("descarga el archivo con su nombre, anuncia «Descarga lista.» y libera el enlace", async () => {
    const onExport = vi.fn<() => Promise<Result<File>>>(async () => ({ ok: true, data: file }));
    render(<DownloadData onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: "Descargar mis datos" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Descarga lista."));
    expect(clicked).toEqual([{ download: file.filename, href: "blob:test" }]);
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toContain("application/json");
    expect(await blob.text()).toBe(file.content);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("mientras prepara el botón dice «Preparando…» y está desactivado", async () => {
    let finish!: (r: Result<File>) => void;
    const onExport = vi.fn(() => new Promise<Result<File>>((r) => (finish = r)));
    render(<DownloadData onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: "Descargar mis datos" }));
    const busy = screen.getByRole("button", { name: "Preparando…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    finish({ ok: true, data: file });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Descargar mis datos" })).toBeTruthy(),
    );
  });

  it("el límite de frecuencia se muestra con su texto y no descarga nada", async () => {
    render(
      <DownloadData onExport={async () => ({ ok: false, error: "DATA_EXPORT_RATE_LIMITED" })} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Descargar mis datos" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Ya has descargado tus datos hace poco. Inténtalo de nuevo en unos minutos.",
    );
    expect(clicked).toEqual([]);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("una acción que lanza se muestra como error de red", async () => {
    render(
      <DownloadData
        onExport={async () => {
          throw new Error("x");
        }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Descargar mis datos" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/conexión/i);
  });
});

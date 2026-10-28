// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";

const saveAction = vi.fn<(pollId: string, save: boolean) => Promise<Result<void>>>();
vi.mock("@/app/save-actions", () => ({ saveAction }));

const { SavePoll } = await import("./save-poll");

beforeEach(() => {
  saveAction.mockReset();
  saveAction.mockResolvedValue({ ok: true, data: undefined });
});
afterEach(cleanup);

const ID = "11111111-2222-4333-8444-555555555555";

describe("SavePoll", () => {
  it("un visitante ve un enlace al login con retorno a la encuesta", () => {
    render(<SavePoll pollId={ID} signedIn={false} />);
    const link = screen.getByRole("link", { name: "Guardar para luego" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent(`/polls/${ID}`)}`);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("con sesión es un botón de marcador que refleja el estado con aria-pressed", () => {
    render(<SavePoll pollId={ID} signedIn initialSaved={false} />);
    expect(
      screen.getByRole("button", { name: "Guardar para luego" }).getAttribute("aria-pressed"),
    ).toBe("false");
    cleanup();
    render(<SavePoll pollId={ID} signedIn initialSaved />);
    expect(
      screen.getByRole("button", { name: "Quitar de guardadas" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("cambia al instante, antes de que responda el servidor, y confirma con él", async () => {
    let resolve!: (r: Result<void>) => void;
    saveAction.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<SavePoll pollId={ID} signedIn initialSaved={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar para luego" }));
    expect(saveAction).toHaveBeenCalledWith(ID, true);
    expect(screen.getByRole("button", { name: "Quitar de guardadas" })).toBeTruthy();
    resolve({ ok: true, data: undefined });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByRole("button", { name: "Quitar de guardadas" })).toBeTruthy();
  });

  it("quitar de guardadas llama con save=false", async () => {
    render(<SavePoll pollId={ID} signedIn initialSaved />);
    await userEvent.click(screen.getByRole("button", { name: "Quitar de guardadas" }));
    expect(saveAction).toHaveBeenCalledWith(ID, false);
    expect(screen.getByRole("button", { name: "Guardar para luego" })).toBeTruthy();
  });

  it("si el servidor falla revierte el estado y explica el motivo", async () => {
    saveAction.mockResolvedValue({ ok: false, error: "NETWORK_ERROR" });
    render(<SavePoll pollId={ID} signedIn initialSaved={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar para luego" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar para luego" })).toBeTruthy();
  });

  it("una sesión caducada lleva al login en lugar de quedar en silencio", async () => {
    saveAction.mockResolvedValue({ ok: false, error: "AUTH_REQUIRED" });
    render(<SavePoll pollId={ID} signedIn initialSaved={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar para luego" }));
    const link = await screen.findByRole("link", { name: /Inicia sesión/ });
    expect(link.getAttribute("href")).toContain("/login?next=");
  });

  it("no envía una segunda petición mientras la primera está en curso", async () => {
    let resolve!: (r: Result<void>) => void;
    saveAction.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<SavePoll pollId={ID} signedIn initialSaved={false} />);
    const button = screen.getByRole("button", { name: "Guardar para luego" });
    await userEvent.click(button);
    await userEvent.click(screen.getByRole("button", { name: "Quitar de guardadas" }));
    expect(saveAction).toHaveBeenCalledTimes(1);
    resolve({ ok: true, data: undefined });
  });

  it("el botón mide al menos 44 px de alto", () => {
    render(<SavePoll pollId={ID} signedIn initialSaved={false} />);
    expect(screen.getByRole("button").className).toMatch(/min-h-11/);
  });
});

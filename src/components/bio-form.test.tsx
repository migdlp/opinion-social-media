// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { BioForm } from "./bio-form";

afterEach(cleanup);

type Save = (bio: string | null) => Promise<Result<void>>;
const ok = async (): Promise<Result<void>> => ({ ok: true, data: undefined });
const box = () => screen.getByRole("textbox", { name: "Descripción" }) as HTMLTextAreaElement;

describe("BioForm (PROFILE-002)", () => {
  it("parte de la descripción actual, es opcional y explica quién la ve", () => {
    render(<BioForm initial="Hola" onSave={vi.fn<Save>(ok)} onDone={vi.fn()} />);
    expect(box().value).toBe("Hola");
    expect(box().required).toBe(false);
    expect(screen.getByText(/cuenta privada.*seguidores/i)).toBeDefined();
    expect(screen.getByText("4 / 280")).toBeDefined();
  });

  it("guarda recortada, avisa y refresca; un doble clic mientras guarda envía una sola vez", async () => {
    let release!: (r: Result<void>) => void;
    const onSave = vi.fn<Save>(() => new Promise((resolve) => (release = resolve)));
    const onDone = vi.fn();
    render(<BioForm onSave={onSave} onDone={onDone} />);
    await userEvent.type(box(), "  Me gusta opinar  ");
    const send = screen.getByRole("button", { name: "Guardar descripción" });
    await userEvent.click(send);
    await userEvent.click(send);
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("Me gusta opinar");
    release({ ok: true, data: undefined });
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/guardada/i));
    expect(onDone).toHaveBeenCalled();
  });

  it("vaciar el campo quita la descripción (envía null)", async () => {
    const onSave = vi.fn<Save>(ok);
    render(<BioForm initial="Hola" onSave={onSave} onDone={vi.fn()} />);
    await userEvent.clear(box());
    await userEvent.click(screen.getByRole("button", { name: "Guardar descripción" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
  });

  it("pasado el límite avisa junto al campo, conserva el texto y no llama al servidor", async () => {
    const onSave = vi.fn<Save>(ok);
    render(<BioForm onSave={onSave} onDone={vi.fn()} />);
    const long = "a".repeat(281);
    await userEvent.click(box());
    await userEvent.paste(long);
    expect(screen.getByText("281 / 280")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Guardar descripción" }));
    expect(screen.getByRole("alert").textContent).toMatch(/280 caracteres/i);
    expect(box().getAttribute("aria-invalid")).toBe("true");
    expect(box().value).toBe(long);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cuenta puntos de código Unicode, como la base de datos", async () => {
    render(<BioForm onSave={vi.fn<Save>(ok)} onDone={vi.fn()} />);
    await userEvent.click(box());
    await userEvent.paste("😀😀😀");
    expect(screen.getByText("3 / 280")).toBeDefined();
  });

  it.each([
    ["BIO_INVALID", /280 caracteres/i],
    ["NETWORK_ERROR", /conexión/i],
    ["PROFILE_REQUIRED", /usuario/i],
  ] as const)("si el servidor devuelve %s lo explica y conserva lo escrito", async (code, text) => {
    const onSave = vi.fn<Save>(async () => ({ ok: false, error: code }));
    const onDone = vi.fn();
    render(<BioForm onSave={onSave} onDone={onDone} />);
    await userEvent.type(box(), "Mi texto");
    await userEvent.click(screen.getByRole("button", { name: "Guardar descripción" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(text);
    expect(box().value).toBe("Mi texto");
    expect(onDone).not.toHaveBeenCalled();
  });
});

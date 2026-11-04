// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { CommentForm } from "./comment-form";

afterEach(cleanup);

const OK: Result<{ id: string }> = { ok: true, data: { id: "c-1" } };
const setup = (post = vi.fn(async (): Promise<Result<{ id: string }>> => OK)) => {
  const onPosted = vi.fn();
  render(<CommentForm pollId="p1" post={post} onPosted={onPosted} />);
  return { post, onPosted };
};
const box = () =>
  screen.getByRole("textbox", { name: "Escribe un comentario" }) as HTMLTextAreaElement;
const send = () => userEvent.click(screen.getByRole("button", { name: "Publicar comentario" }));

describe("CommentForm (CMT-002)", () => {
  it("tiene etiqueta, límite de 1000 caracteres y avisa de que el comentario es público", () => {
    setup();
    expect(box().maxLength).toBe(1000);
    expect(screen.getByText(/tu @usuario será visible/i)).toBeDefined();
    expect(screen.getByText(/no revela tu voto/i)).toBeDefined();
  });

  it("vacío o en blanco no se envía y explica el motivo", async () => {
    const { post } = setup();
    await send();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/escribe algo/i);
    await userEvent.type(box(), "   ");
    await send();
    expect(post).not.toHaveBeenCalled();
  });

  it("publica el texto recortado, vacía el campo y avisa para refrescar el debate", async () => {
    const { post, onPosted } = setup();
    await userEvent.type(box(), "  Mi opinión  ");
    await send();
    await waitFor(() => expect(onPosted).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledWith("p1", "Mi opinión");
    expect(box().value).toBe("");
  });

  it("un doble clic publica una sola vez", async () => {
    let finish: (r: Result<{ id: string }>) => void = () => {};
    const post = vi.fn(() => new Promise<Result<{ id: string }>>((resolve) => (finish = resolve)));
    setup(post);
    await userEvent.type(box(), "Hola");
    const button = screen.getByRole("button", { name: "Publicar comentario" });
    await userEvent.dblClick(button);
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Publicando…" }).hasAttribute("disabled")).toBe(true);
    finish(OK);
    await waitFor(() => expect(box().value).toBe(""));
  });

  it("un error conserva el texto, lo explica y deja reintentar", async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "RATE_LIMITED" })
      .mockResolvedValueOnce(OK);
    const { onPosted } = setup(post);
    await userEvent.type(box(), "Hola");
    await send();
    expect((await screen.findByRole("alert")).textContent).toMatch(/demasiados comentarios/i);
    expect(box().value).toBe("Hola");
    expect(onPosted).not.toHaveBeenCalled();
    await send();
    await waitFor(() => expect(onPosted).toHaveBeenCalledOnce());
  });

  it("tras una caída de red no se sabe si se publicó: conserva el texto y refresca el debate", async () => {
    const post = vi.fn(async (): Promise<Result<{ id: string }>> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    const { onPosted } = setup(post);
    await userEvent.type(box(), "Hola");
    await send();
    expect((await screen.findByRole("alert")).textContent).toMatch(/revisa los comentarios/i);
    expect(box().value).toBe("Hola");
    expect(onPosted).toHaveBeenCalledOnce();
  });

  it("si la acción ni responde (se rechaza), es un error de red, no una excepción", async () => {
    const post = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    setup(post as never);
    await userEvent.type(box(), "Hola");
    await send();
    expect(await screen.findByRole("alert")).toBeDefined();
  });
});

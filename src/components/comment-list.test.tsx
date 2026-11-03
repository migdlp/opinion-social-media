// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommentPage, PollComment, Result } from "@/lib/data/types";
import { CommentList } from "./comment-list";

afterEach(cleanup);

const NOW = new Date("2026-10-30T12:00:00Z");
const comment = (n: number, over: Partial<PollComment> = {}): PollComment => ({
  id: `c-${n}`,
  username: `user_${n}`,
  displayName: n % 2 ? "Nombre Visible" : null,
  body: `Comentario ${n}`,
  createdAt: "2026-10-30T11:00:00Z",
  ...over,
});
const page = (items: PollComment[], nextCursor: string | null = null): CommentPage => ({
  items,
  nextCursor,
});
const setup = (
  initial: CommentPage,
  loadMore = vi.fn(async (): Promise<Result<CommentPage>> => ({ ok: true, data: page([]) })),
  report = vi.fn(async (): Promise<Result<void>> => ({ ok: true, data: undefined })),
  signedIn = true,
) => {
  render(
    <CommentList
      pollId="p1"
      initial={initial}
      loadMore={loadMore}
      report={report}
      signedIn={signedIn}
      now={NOW}
    />,
  );
  return { loadMore, report };
};

describe("CommentList (CMT-002)", () => {
  it("muestra autor, @usuario enlazado, fecha y el texto como texto plano", () => {
    setup(page([comment(1, { body: "<img src=x onerror=alert(1)> hola" })]));
    const list = screen.getByRole("list", { name: "Comentarios" });
    expect(within(list).getByText("<img src=x onerror=alert(1)> hola")).toBeDefined();
    expect(list.querySelector("img")).toBeNull();
    expect(
      within(list)
        .getByRole("link", { name: /@user_1/ })
        .getAttribute("href"),
    ).toBe("/u/user_1");
    expect(within(list).getByText("Nombre Visible")).toBeDefined();
    expect(list.querySelector("time")?.getAttribute("datetime")).toBe("2026-10-30T11:00:00Z");
  });

  it("sin comentarios dice que aún no hay y anima a abrir el debate", () => {
    setup(page([]));
    expect(screen.getByText(/todavía no hay comentarios/i)).toBeDefined();
  });

  it("«Cargar más» añade la página siguiente sin duplicar y desaparece al terminar", async () => {
    const loadMore = vi.fn(async (): Promise<Result<CommentPage>> => ({
      ok: true,
      data: page([comment(2), comment(3)]),
    }));
    setup(page([comment(1), comment(2)], "c0"), loadMore);
    await userEvent.click(screen.getByRole("button", { name: "Cargar más comentarios" }));
    await waitFor(() => expect(screen.getByText("Comentario 3")).toBeDefined());
    expect(loadMore).toHaveBeenCalledWith("p1", "c0");
    expect(screen.getAllByText("Comentario 2")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Cargar más comentarios" })).toBeNull();
  });

  it("un error al cargar más conserva la lista, avisa y permite reintentar", async () => {
    const loadMore = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "NETWORK_ERROR" })
      .mockResolvedValueOnce({ ok: true, data: page([comment(3)]) });
    setup(page([comment(1)], "c0"), loadMore);
    await userEvent.click(screen.getByRole("button", { name: "Cargar más comentarios" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/conexión/i);
    expect(screen.getByText("Comentario 1")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Cargar más comentarios" }));
    await waitFor(() => expect(screen.getByText("Comentario 3")).toBeDefined());
  });

  it("denunciar: abre el formulario, exige motivo, lo envía y confirma", async () => {
    const { report } = setup(page([comment(1)]));
    await userEvent.click(screen.getByText("Denunciar"));
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));
    expect(report).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/elige un motivo/i);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "acoso");
    await userEvent.type(screen.getByRole("textbox", { name: /detalle/i }), "Es ofensivo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));
    await waitFor(() => expect(screen.getByText(/gracias, hemos recibido/i)).toBeDefined());
    expect(report).toHaveBeenCalledWith("c-1", "acoso", "Es ofensivo");
  });

  it("denunciar dos veces el mismo comentario lo explica sin reenviar", async () => {
    const report = vi.fn(async (): Promise<Result<void>> => ({
      ok: false,
      error: "ALREADY_REPORTED",
    }));
    setup(page([comment(1)]), undefined, report);
    await userEvent.click(screen.getByText("Denunciar"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "spam");
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/ya habías denunciado/i);
  });

  it("un comentario que ya no está disponible se explica sin dar pistas", async () => {
    const report = vi.fn(async (): Promise<Result<void>> => ({
      ok: false,
      error: "COMMENT_UNAVAILABLE",
    }));
    setup(page([comment(1)]), undefined, report);
    await userEvent.click(screen.getByText("Denunciar"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "spam");
    await userEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/ya no está disponible/i);
  });

  it("sin sesión no ofrece denunciar", () => {
    setup(page([comment(1)]), undefined, undefined, false);
    expect(screen.queryByText("Denunciar")).toBeNull();
  });
});

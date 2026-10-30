// @vitest-environment jsdom
// CMT-002: sección de debate bajo el detalle de una encuesta.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeResponse } from "@/lib/data/testing/fake-supabase";
import type { PollViewerState } from "@/lib/data/types";

let responses: Record<string, FakeResponse | FakeResponse[]> = {};
let queries: ReturnType<typeof fakeSupabase>["queries"] = [];
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const fake = fakeSupabase(responses);
    queries = fake.queries;
    return {
      ...fake.supabase,
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    };
  },
}));
const refresh = vi.fn();
const router = { refresh };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { CommentsSection } = await import("./comments-section");

const POLL = "00000000-0000-4000-8000-000000000001";
const row = (n: number) => ({
  comment_id: `c-${n}`,
  username: `user_${n}`,
  display_name: null,
  body: `Comentario ${n}`,
  created_at: "2026-10-30T11:00:00+00:00",
  cursor: `cur-${n}`,
});
const NOT_VOTED: PollViewerState = { kind: "not_voted" };
const VOTED: PollViewerState = {
  kind: "voted",
  results: { pollId: POLL, totalVotes: 1, myOptionId: "a", options: [] },
};
const show = async (props: Partial<Parameters<typeof CommentsSection>[0]> = {}) =>
  render(
    await CommentsSection({
      pollId: POLL,
      enabled: true,
      isAuthor: false,
      signedIn: true,
      closed: false,
      viewer: VOTED,
      ...props,
    }),
  );

beforeEach(() => {
  responses = {};
  queries = [];
  refresh.mockClear();
});
afterEach(cleanup);

describe("CommentsSection (CMT-002)", () => {
  it("apagado y no autora: no muestra nada ni consulta comentarios", async () => {
    const { container } = await show({ enabled: false });
    expect(container.textContent).toBe("");
    expect(queries).toEqual([]);
  });

  it("apagado y autora: ofrece activarlo, sin pedir comentarios", async () => {
    await show({ enabled: false, isAuthor: true });
    expect(
      (screen.getByRole("checkbox", { name: "Comentarios" }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(queries).toEqual([]);
  });

  it("abierta sin voto: explica cómo acceder y NO pide ni muestra comentarios", async () => {
    responses = { "rpc:list_comments": { data: [row(1)], error: null } };
    await show({ viewer: NOT_VOTED });
    expect(screen.getByText(/vota para ver y escribir comentarios/i)).toBeDefined();
    expect(screen.queryByText("Comentario 1")).toBeNull();
    expect(queries.map((q) => q.target)).not.toContain("rpc:list_comments");
  });

  it("visitante en abierta: invita a votar, sin payload de comentarios", async () => {
    await show({ viewer: { kind: "anonymous" }, signedIn: false });
    expect(screen.getByText(/vota para ver y escribir comentarios/i)).toBeDefined();
    expect(queries).toEqual([]);
  });

  it("tras votar muestra el debate y el formulario", async () => {
    responses = { "rpc:list_comments": { data: [row(1), row(2)], error: null } };
    await show();
    expect(screen.getByText("Comentario 1")).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Escribe un comentario" })).toBeDefined();
    expect(screen.getByText(/ocultar tu historial de votos no oculta/i)).toBeDefined();
  });

  it("cerrada: lo ve un visitante sin votar, pero sin formulario hasta iniciar sesión", async () => {
    responses = { "rpc:list_comments": { data: [row(1)], error: null } };
    await show({ closed: true, viewer: { kind: "anonymous" }, signedIn: false });
    expect(screen.getByText("Comentario 1")).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("link", { name: /inicia sesión para comentar/i })).toBeDefined();
  });

  it("la autora ve el interruptor activado junto al debate", async () => {
    responses = { "rpc:list_comments": { data: [], error: null } };
    await show({ isAuthor: true });
    expect(
      (screen.getByRole("checkbox", { name: "Comentarios" }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("un error al cargar el debate es recuperable y no rompe la encuesta", async () => {
    responses = {
      "rpc:list_comments": { data: null, error: { code: "P0001", message: "VOTE_REQUIRED" } },
    };
    await show();
    expect(screen.getByRole("alert").textContent).toMatch(/vota primero/i);
  });

  it("al votar en esa encuesta refresca para abrir el debate; el voto en otra no", async () => {
    await show({ viewer: NOT_VOTED });
    window.dispatchEvent(new CustomEvent("opinion:voted", { detail: { pollId: "otra" } }));
    expect(refresh).not.toHaveBeenCalled();
    window.dispatchEvent(new CustomEvent("opinion:voted", { detail: { pollId: POLL } }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});

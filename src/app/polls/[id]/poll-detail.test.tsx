// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, networkThrow, type FakeResponse } from "@/lib/data/testing/fake-supabase";

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

// notFound() de Next.js corta el render; aquí lo simulamos con un error reconocible.
const NOT_FOUND = new Error("NEXT_NOT_FOUND");
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));

const { PollDetailLoader } = await import("./poll-detail");

const ID = "11111111-2222-4333-8444-555555555555";
const row = {
  id: ID,
  question: "¿Tortilla con o sin cebolla?",
  created_at: "2026-10-27T19:00:00Z",
  poll_options: [
    { id: "a", text: "Con cebolla", position: 1 },
    { id: "b", text: "Sin cebolla", position: 2 },
  ],
};

beforeEach(() => {
  responses = {};
});
afterEach(cleanup);

describe("PollDetailLoader (/polls/[id])", () => {
  it("una encuesta publicada se ve sin sesión, con pregunta y opciones", async () => {
    responses = { polls: { data: row, error: null } };

    render(await PollDetailLoader({ id: ID }));

    expect(screen.getByRole("heading", { level: 1, name: row.question })).toBeDefined();
    expect(screen.getByText("Con cebolla")).toBeDefined();
    expect(screen.getByText("Sin cebolla")).toBeDefined();
  });

  it("una encuesta inexistente u oculta responde como no disponible (404)", async () => {
    responses = { polls: { data: null, error: null } };

    await expect(PollDetailLoader({ id: ID })).rejects.toBe(NOT_FOUND);
  });

  it("un id mal formado responde 404 sin llegar a consultar la base de datos", async () => {
    await expect(PollDetailLoader({ id: "no-es-un-uuid" })).rejects.toBe(NOT_FOUND);
    expect(queries).toEqual([]);
  });

  it("un fallo de red muestra un estado de recuperación, no un 404", async () => {
    responses = { polls: networkThrow };

    render(await PollDetailLoader({ id: ID }));

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe(
      `/polls/${ID}`,
    );
  });

  it("V2-033: al volver del login marca la opción elegida, sin votarla; una ajena se ignora", async () => {
    responses = { polls: { data: row, error: null } };

    render(await PollDetailLoader({ id: ID, option: "b" }));
    expect((screen.getByRole("radio", { name: "Sin cebolla" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(queries.map((q) => q.target)).not.toContain("rpc:vote_poll");
    cleanup();

    responses = { polls: { data: row, error: null } };
    render(await PollDetailLoader({ id: ID, option: "zzz" }));
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });

  // CMT-002: el debate bajo la encuesta.
  it("pide el ajuste público de comentarios de esa encuesta", async () => {
    responses = { polls: { data: row, error: null } };
    render(await PollDetailLoader({ id: ID }));
    const flag = queries.find((q) =>
      q.calls.some((c) => c[0] === "select" && c[1] === "comments_enabled"),
    );
    expect(flag).toBeDefined();
  });

  it("con el debate apagado no hay sección de comentarios", async () => {
    responses = { polls: { data: { ...row, comments_enabled: false }, error: null } };
    render(await PollDetailLoader({ id: ID }));
    expect(screen.queryByRole("heading", { level: 2, name: "Comentarios" })).toBeNull();
    expect(queries.map((q) => q.target)).not.toContain("rpc:list_comments");
  });

  it("con el debate activado y sin voto explica cómo acceder y no pide comentarios", async () => {
    responses = { polls: { data: { ...row, comments_enabled: true }, error: null } };
    render(await PollDetailLoader({ id: ID }));
    expect(screen.getByRole("heading", { level: 2, name: "Comentarios" })).toBeDefined();
    expect(screen.getByText(/vota para ver y escribir comentarios/i)).toBeDefined();
    expect(queries.map((q) => q.target)).not.toContain("rpc:list_comments");
  });
});

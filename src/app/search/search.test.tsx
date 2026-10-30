// @vitest-environment jsdom
// SEARCH-002: la página /search con la consulta en la URL.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, networkThrow, type FakeResponse } from "@/lib/data/testing/fake-supabase";

let responses: Record<string, FakeResponse | FakeResponse[]> = {};
let queries: ReturnType<typeof fakeSupabase>["queries"] = [];
let user: { id: string } | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const fake = fakeSupabase(responses);
    queries = fake.queries;
    return { ...fake.supabase, auth: { getUser: async () => ({ data: { user }, error: null }) } };
  },
}));

const { SearchContent } = await import("./search-content");

const ID1 = "00000000-0000-4000-8000-000000000001";
const row = (id: string, question: string) => ({
  id,
  question,
  created_at: "2026-10-27T10:00:00Z",
  poll_options: [
    { id: `${id}a`, text: "Sí", position: 1 },
    { id: `${id}b`, text: "No", position: 2 },
  ],
});
const hit = (id: string) => ({
  poll_id: id,
  created_at: "2026-10-27T10:00:00+00:00",
  cursor: `2026-10-27T10:00:00.000000Z|${id}|hash`,
});
const show = async (q?: string | string[]) =>
  render(await SearchContent({ searchParams: Promise.resolve(q === undefined ? {} : { q }) }));

beforeEach(() => {
  responses = {};
  queries = [];
  user = null;
});
afterEach(cleanup);

describe("SearchContent (SEARCH-002)", () => {
  it("sin consulta muestra la invitación a buscar y no consulta nada", async () => {
    await show();
    expect(screen.getByText(/escribe una palabra/i)).toBeDefined();
    expect(queries).toEqual([]);
  });

  it("una consulta vacía o de un carácter no busca y explica el mínimo", async () => {
    for (const q of ["", "   ", "a"]) {
      cleanup();
      await show(q);
      expect(queries, JSON.stringify(q)).toEqual([]);
    }
    cleanup();
    await show("a");
    expect(screen.getByText(/al menos 2 caracteres/i)).toBeDefined();
  });

  it("con una consulta válida muestra las tarjetas en el orden de la RPC", async () => {
    responses = {
      "rpc:search_polls": { data: [hit(ID1)], error: null },
      polls: { data: [row(ID1, "¿Café o té?")], error: null },
    };
    await show("  café  ");

    expect(screen.getByRole("heading", { level: 2, name: "¿Café o té?" })).toBeDefined();
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "search_polls",
      { p_query: "café", p_cursor: null },
    ]);
    expect(screen.getByText(/resultados para «café»/i).getAttribute("role")).toBe("status");
  });

  it("sin coincidencias lo dice con la consulta y ofrece volver al feed", async () => {
    responses = { "rpc:search_polls": { data: [], error: null } };
    await show("zzzz");
    expect(screen.getByText(/ninguna encuesta con «zzzz»/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /ver el feed/i }).getAttribute("href")).toBe("/");
  });

  it("un fallo de red es un error recuperable que conserva la consulta", async () => {
    responses = { "rpc:search_polls": networkThrow };
    await show("café");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/no se han podido cargar/i);
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe(
      "/search?q=caf%C3%A9",
    );
  });

  it("con una consulta repetida en la URL usa la primera", async () => {
    responses = { "rpc:search_polls": { data: [], error: null } };
    await show(["uno", "dos"]);
    expect(queries[0].calls[0][2]).toMatchObject({ p_query: "uno" });
  });

  it("la caja de búsqueda conserva la consulta escrita", async () => {
    responses = { "rpc:search_polls": { data: [], error: null } };
    await show("café");
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("café");
  });
});

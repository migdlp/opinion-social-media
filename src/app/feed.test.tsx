// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, networkThrow, type FakeResponse } from "@/lib/data/testing/fake-supabase";

// El feed real se carga en el servidor con el cliente de src/lib/supabase/server.ts.
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

const { Feed } = await import("./feed");

const row = (id: string, question: string, created_at: string) => ({
  id,
  question,
  created_at,
  poll_options: [
    { id: `${id}a`, text: "Sí", position: 1 },
    { id: `${id}b`, text: "No", position: 2 },
  ],
});

beforeEach(() => {
  responses = {};
});
afterEach(cleanup);

describe("Feed (página /)", () => {
  it("un visitante sin sesión ve las encuestas publicadas, la más reciente primero", async () => {
    responses = {
      polls: {
        data: [
          row("p2", "¿Recién publicada?", "2026-10-27T19:59:00Z"),
          row("p1", "¿Más antigua?", "2026-10-27T10:00:00Z"),
        ],
        error: null,
      },
    };

    render(await Feed());

    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "¿Recién publicada?",
      "¿Más antigua?",
    ]);
    // El primer lote se pide ordenado por fecha descendente (y UUID para desempatar).
    const polls = queries.find((q) => q.target === "polls")!;
    expect(polls.calls).toContainEqual(["order", "created_at", { ascending: false }]);
    // Sin sesión no se consultan votos.
    expect(queries.map((q) => q.target)).toEqual(["polls"]);
  });

  it("un fallo de red muestra el estado de recuperación en lugar de romper la página", async () => {
    responses = { polls: networkThrow };

    render(await Feed());

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reintentar" })).toBeDefined();
  });
});

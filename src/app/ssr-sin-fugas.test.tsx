// MVP-044, criterio 2: las páginas SSR no revelan totales globales a quien no ha votado.
// Se renderiza el HTML real de `/` y `/polls/[id]` con un Supabase falso cuyas respuestas
// llevan cifras trampa; si alguna llegara al HTML (o se pidiera el RPC de resultados),
// el test falla. Cubre visitante sin sesión y usuario con sesión que aún no ha votado.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeResponse } from "@/lib/data/testing/fake-supabase";

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
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { Feed } = await import("./feed");
const { PollDetailLoader } = await import("./polls/[id]/poll-detail");

const ID = "11111111-2222-4333-8444-555555555555";
const TRAPS = ["7771", "7772", "7773", "7774"];
// Filas con campos que la base nunca devolvería a este cliente: son la trampa.
const row = {
  id: ID,
  question: "¿Tortilla con o sin cebolla?",
  created_at: "2026-10-27T19:00:00Z",
  vote_count: 7771,
  total_votes: 7772,
  poll_options: [
    { id: "a", text: "Con cebolla", position: 1, votes: 7773, percentage: 7774 },
    { id: "b", text: "Sin cebolla", position: 2, votes: 7773, percentage: 7774 },
  ],
};

function expectNoAggregates(html: string) {
  expect(html).toContain("Con cebolla");
  for (const trap of TRAPS) expect(html).not.toContain(trap);
  const withoutLock = html.replaceAll("?? %", "");
  expect(withoutLock).not.toMatch(/\d\s*%/);
  expect(withoutLock).not.toMatch(/\d+\s*votos?\b/i);
  expect(queries.map((q) => q.target)).not.toContain("rpc:get_poll_results");
  const polls = queries.find((q) => q.target === "polls")!;
  const select = polls.calls.find((c) => c[0] === "select")![1] as string;
  expect(select).toBe("id, question, created_at, poll_options(id, text, position)");
}

beforeEach(() => {
  responses = {};
  user = null;
});

describe.each([
  ["un visitante sin sesión", null],
  ["un usuario con sesión que aún no ha votado", { id: "u1" }],
])("HTML SSR para %s", (_name, viewer) => {
  beforeEach(() => {
    user = viewer;
  });

  it("el feed (/) no incluye totales ni porcentajes", async () => {
    responses = { polls: { data: [row], error: null }, votes: { data: [], error: null } };

    expectNoAggregates(renderToStaticMarkup(await Feed()));
  });

  it("el detalle (/polls/[id]) no incluye totales ni porcentajes", async () => {
    responses = { polls: { data: row, error: null }, votes: { data: null, error: null } };

    expectNoAggregates(renderToStaticMarkup(await PollDetailLoader({ id: ID })));
  });
});

// Control: el escenario "con voto" sí pide el RPC de resultados. Hoy el detalle aún no los
// pinta (llega con MVP-037), así que se comprueba la consulta, no el HTML; los tests de
// arriba fallarían si el HTML o las consultas de quien no ha votado incluyeran agregados.
describe("control: quien ya votó sí dispara la consulta de resultados", () => {
  it("el detalle de un votante llama a get_poll_results", async () => {
    user = { id: "u1" };
    responses = {
      polls: { data: row, error: null },
      votes: { data: { option_id: "a" }, error: null },
      "rpc:get_poll_results": { data: [], error: null },
    };

    await PollDetailLoader({ id: ID });

    expect(queries.map((q) => q.target)).toContain("rpc:get_poll_results");
  });
});

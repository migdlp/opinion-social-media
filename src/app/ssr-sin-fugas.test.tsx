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
  expect(select).toBe(
    "id, question, created_at, closes_at, category:categories(slug, name), poll_options(id, text, position)",
  );
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

// Quien ya votó sí recibe los resultados, directamente en el HTML y sin formulario
// (MVP-037 y MVP-038: también al volver desde otro dispositivo o sesión).
describe("quien ya votó", () => {
  const resultRows = [
    {
      option_id: "a",
      text: "Con cebolla",
      position: 1,
      votes: 3,
      percentage: 75,
      total_votes: 4,
      my_option_id: "a",
    },
    {
      option_id: "b",
      text: "Sin cebolla",
      position: 2,
      votes: 1,
      percentage: 25,
      total_votes: 4,
      my_option_id: "a",
    },
  ];

  it("ve los resultados en el detalle, con su voto señalado y sin poder votar otra vez", async () => {
    user = { id: "u1" };
    responses = {
      polls: { data: row, error: null },
      votes: { data: { option_id: "a" }, error: null },
      "rpc:get_poll_results": { data: resultRows, error: null },
    };

    const html = renderToStaticMarkup(await PollDetailLoader({ id: ID }));

    expect(html).toMatch(/75,0\s*%/);
    expect(html).toContain("Tu voto");
    expect(html).not.toContain('type="radio"');
    expect(html).not.toContain("Votar");
    expect(queries.map((q) => q.target)).toContain("rpc:get_poll_results");
  });

  it("ve los resultados en la tarjeta del feed solo de las encuestas en las que votó", async () => {
    user = { id: "u1" };
    const other = { ...row, id: "99999999-2222-4333-8444-555555555555", question: "¿Otra?" };
    responses = {
      polls: { data: [row, other], error: null },
      votes: { data: [{ poll_id: ID, option_id: "a" }], error: null },
      "rpc:get_poll_results": { data: resultRows, error: null },
    };

    const html = renderToStaticMarkup(await Feed());

    expect(html.match(/75,0\s*%/g)).toHaveLength(1);
    expect(html).toContain("Tu voto");
    // Una sola consulta de votos propios para el lote y resultados sólo de la votada.
    const targets = queries.map((q) => q.target);
    expect(targets.filter((t) => t === "votes")).toHaveLength(1);
    expect(targets.filter((t) => t === "rpc:get_poll_results")).toHaveLength(1);
  });
});

// V2-003, criterio 3: la respuesta del feed y del detalle firma con @usuario y nunca
// contiene user_id (la fila trampa lo lleva y la base nunca lo devolvería a este cliente).
describe("autor de la encuesta", () => {
  const authors = [{ poll_id: ID, username: "ana_23", display_name: "Ana María" }];
  const trapRow = { ...row, user_id: "USERID-SECRETO", author_id: "USERID-SECRETO" };

  it.each([
    ["el feed", () => Feed()],
    ["el detalle", () => PollDetailLoader({ id: ID })],
  ])("%s firma con @usuario enlazado y no incluye user_id", async (_name, render) => {
    responses = {
      polls: { data: _name === "el feed" ? [trapRow] : trapRow, error: null },
      votes: { data: [], error: null },
      "rpc:get_poll_authors": { data: authors, error: null },
    };

    const html = renderToStaticMarkup(await render());

    expect(html).toContain("@ana_23");
    expect(html).toContain("Ana María");
    expect(html).toContain('href="/u/ana_23"');
    expect(html).not.toContain("USERID-SECRETO");
    expect(html).not.toMatch(/user_id|userId/);
    expect(html).not.toContain("Anónimo");
  });

  it("sin perfil del autor se muestra «Anónimo» sin enlace", async () => {
    responses = {
      polls: { data: [row], error: null },
      votes: { data: [], error: null },
      "rpc:get_poll_authors": { data: [], error: null },
    };

    const html = renderToStaticMarkup(await Feed());

    expect(html).toContain("Anónimo");
    expect(html).not.toContain("/u/");
  });
});

// V2-014, criterio 4 y D-020: justo antes de cerrar no hay agregados en el HTML; cerrada, sus
// resultados son públicos incluso para un visitante sin sesión.
describe("cierre de la encuesta", () => {
  const closedRows = [
    {
      option_id: "a",
      text: "Con cebolla",
      position: 1,
      votes: 3,
      percentage: 75,
      total_votes: 4,
      my_option_id: null,
    },
    {
      option_id: "b",
      text: "Sin cebolla",
      position: 2,
      votes: 1,
      percentage: 25,
      total_votes: 4,
      my_option_id: null,
    },
  ];
  const closingIn = (ms: number) => ({
    ...row,
    closes_at: new Date(Date.now() + ms).toISOString(),
  });

  it("un segundo antes de cerrar ni el feed ni el detalle incluyen agregados ni piden resultados", async () => {
    const poll = closingIn(60_000);
    responses = {
      polls: { data: [poll], error: null },
      "rpc:get_poll_results": { data: closedRows, error: null },
    };
    expectNoAggregates(renderToStaticMarkup(await Feed()));
    responses = {
      polls: { data: poll, error: null },
      "rpc:get_poll_results": { data: closedRows, error: null },
    };
    expectNoAggregates(renderToStaticMarkup(await PollDetailLoader({ id: ID })));
  });

  it("una vez cerrada, un visitante ve los resultados en el feed y en el detalle, sin «Tu voto»", async () => {
    const poll = closingIn(-60_000);
    for (const [name, render, data] of [
      ["feed", () => Feed(), [poll]],
      ["detalle", () => PollDetailLoader({ id: ID }), poll],
    ] as const) {
      responses = {
        polls: { data, error: null },
        "rpc:get_poll_results": { data: closedRows, error: null },
      };
      const html = renderToStaticMarkup(await render());
      expect(html, name).toMatch(/75,0\s*%/);
      expect(html, name).not.toContain("Tu voto");
      expect(html, name).not.toContain('type="radio"');
    }
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
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

const { loadMoreSearch } = await import("./search-actions");

const ID = "00000000-0000-4000-8000-000000000003";
const CURSOR = `2026-10-27T10:00:00.000000Z|${ID}|hash`;

beforeEach(() => {
  responses = {};
  user = null;
});

describe("loadMoreSearch (SEARCH-002)", () => {
  it("pide la página siguiente con la consulta y el cursor recibidos", async () => {
    responses = {
      "rpc:search_polls": {
        data: [{ poll_id: ID, created_at: "2026-10-27T09:00:00+00:00", cursor: CURSOR }],
        error: null,
      },
      polls: {
        data: [
          { id: ID, question: "¿Nueva?", created_at: "2026-10-27T09:00:00Z", poll_options: [] },
        ],
        error: null,
      },
    };
    const result = await loadMoreSearch("café", CURSOR);

    expect(result.ok && result.data.items.map((i) => i.poll.id)).toEqual([ID]);
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "search_polls",
      { p_query: "café", p_cursor: CURSOR },
    ]);
  });

  it("con sesión pide además los votos propios; sin sesión no", async () => {
    responses = {
      "rpc:search_polls": {
        data: [{ poll_id: ID, created_at: "2026-10-27T09:00:00+00:00", cursor: CURSOR }],
        error: null,
      },
      polls: {
        data: [
          { id: ID, question: "¿Nueva?", created_at: "2026-10-27T09:00:00Z", poll_options: [] },
        ],
        error: null,
      },
      votes: { data: [], error: null },
    };
    await loadMoreSearch("café", CURSOR);
    expect(queries.map((q) => q.target)).not.toContain("votes");
    user = { id: "u1" };
    await loadMoreSearch("café", CURSOR);
    expect(queries.map((q) => q.target)).toContain("votes");
  });

  it.each(["INVALID_QUERY", "INVALID_CURSOR"])(
    "devuelve %s como error, no como excepción",
    async (code) => {
      responses = { "rpc:search_polls": { data: null, error: { code: "P0001", message: code } } };
      expect(await loadMoreSearch("x", "c")).toEqual({ ok: false, error: code });
    },
  );

  it("un fallo de red no lanza", async () => {
    responses = { "rpc:search_polls": networkThrow };
    expect(await loadMoreSearch("café", CURSOR)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

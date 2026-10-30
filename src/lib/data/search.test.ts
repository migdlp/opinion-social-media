import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { searchPolls } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const ID1 = "00000000-0000-4000-8000-000000000001";
const ID2 = "00000000-0000-4000-8000-000000000002";
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

describe("searchPolls (SEARCH-001)", () => {
  it("llama a search_polls con la consulta y el cursor, y devuelve las encuestas en el orden de la RPC", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:search_polls": { data: [hit(ID2), hit(ID1)], error: null },
      polls: { data: [row(ID1, "¿Café uno?"), row(ID2, "¿Café dos?")], error: null },
    });
    const r = await searchPolls(supabase, "café", null, { signedIn: false });

    expect(r.ok && r.data.items.map((i) => i.poll.question)).toEqual(["¿Café dos?", "¿Café uno?"]);
    expect(r.ok && r.data.nextCursor).toBeNull();
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "search_polls",
      { p_query: "café", p_cursor: null },
    ]);
  });

  it("sin coincidencias no pide encuestas ni votos", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:search_polls": { data: [], error: null } });
    const r = await searchPolls(supabase, "nada", null, { signedIn: true });
    expect(r).toEqual({ ok: true, data: { items: [], nextCursor: null } });
    expect(queries.map((q) => q.target)).toEqual(["rpc:search_polls"]);
  });

  it("la página 21 se queda como cursor y no se muestra", async () => {
    const ids = Array.from(
      { length: 21 },
      (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    const { supabase } = fakeSupabase({
      "rpc:search_polls": { data: ids.map(hit), error: null },
      polls: { data: ids.map((id) => row(id, `¿${id}?`)), error: null },
    });
    const r = await searchPolls(supabase, "café", "c0", { signedIn: false });
    expect(r.ok && r.data.items).toHaveLength(20);
    expect(r.ok && r.data.nextCursor).toBe(`2026-10-27T10:00:00.000000Z|${ids[19]}|hash`);
  });

  it.each(["INVALID_QUERY", "INVALID_CURSOR"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:search_polls": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await searchPolls(supabase, "x", null, { signedIn: false })).toEqual({
      ok: false,
      error: code,
    });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:search_polls": networkThrow });
    expect(await searchPolls(supabase, "café", null, { signedIn: false })).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });

  it("INVALID_QUERY tiene un mensaje claro para la interfaz", () => {
    expect(ERROR_MESSAGES.INVALID_QUERY).toMatch(/2/);
  });
});

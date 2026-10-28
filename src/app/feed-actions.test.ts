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

const { loadMoreFeed } = await import("./feed-actions");

const ID = "00000000-0000-4000-8000-000000000003";
const CURSOR = `2026-10-27T10:00:00.000000Z|${ID}`;

beforeEach(() => {
  responses = {};
  user = null;
});

describe("loadMoreFeed", () => {
  it("devuelve la página siguiente a partir del modo, la categoría y el cursor recibidos", async () => {
    responses = {
      "rpc:get_feed": {
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

    const result = await loadMoreFeed("recientes", "deportes", CURSOR);

    expect(result).toMatchObject({ ok: true, data: { nextCursor: null } });
    if (result.ok) expect(result.data.items.map((i) => i.poll.id)).toEqual([ID]);
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "get_feed",
      { p_mode: "recientes", p_category: "deportes", p_cursor: CURSOR },
    ]);
  });

  it("sin categoría envía null y con sesión usa la identidad del servidor, no argumentos del cliente", async () => {
    user = { id: "u1" };
    responses = { "rpc:get_feed": { data: [], error: null } };
    await loadMoreFeed("siguiendo", null, CURSOR);
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "get_feed",
      { p_mode: "siguiendo", p_category: null, p_cursor: CURSOR },
    ]);
  });

  it("los errores de validación llegan como códigos controlados, sin lanzar", async () => {
    responses = {
      "rpc:get_feed": { data: null, error: { code: "P0001", message: "INVALID_CURSOR" } },
    };
    expect(await loadMoreFeed("recientes", null, "basura")).toEqual({
      ok: false,
      error: "INVALID_CURSOR",
    });
  });

  it("si el servidor falla no lanza: devuelve un error controlado", async () => {
    responses = { "rpc:get_feed": networkThrow };
    expect(await loadMoreFeed("recientes", null, CURSOR)).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });
});

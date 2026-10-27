import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeFeedCursor } from "@/lib/data/polls";
import { fakeSupabase, type FakeResponse } from "@/lib/data/testing/fake-supabase";

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

const { loadMoreFeed } = await import("./feed-actions");

beforeEach(() => {
  responses = {};
});

describe("loadMoreFeed", () => {
  it("devuelve la página siguiente a partir del cursor recibido", async () => {
    responses = {
      polls: {
        data: [
          { id: "p3", question: "¿Nueva?", created_at: "2026-10-27T09:00:00Z", poll_options: [] },
        ],
        error: null,
      },
    };
    const cursor = encodeFeedCursor({
      createdAt: "2026-10-27T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000001",
    });

    const result = await loadMoreFeed(cursor);

    expect(result).toMatchObject({ ok: true, data: { nextCursor: null } });
    if (result.ok) expect(result.data.items.map((i) => i.poll.id)).toEqual(["p3"]);
    // Continúa tras el cursor en lugar de servir la primera página.
    const polls = queries.find((q) => q.target === "polls")!;
    expect(polls.calls.some(([method]) => method === "or")).toBe(true);
  });
});

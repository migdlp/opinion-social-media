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

const { postComment, loadMoreComments, toggleComments, submitCommentReport } =
  await import("./comment-actions");

const POLL = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  responses = {};
  queries = [];
  user = { id: "u1" };
});

describe("acciones de comentarios (CMT-002)", () => {
  it("postComment sin sesión no llega a la base de datos", async () => {
    user = null;
    expect(await postComment(POLL, "hola")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(queries).toEqual([]);
  });

  it("postComment con sesión publica y devuelve el id", async () => {
    responses = { "rpc:add_comment": { data: "c-1", error: null } };
    expect(await postComment(POLL, "hola")).toEqual({ ok: true, data: { id: "c-1" } });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "add_comment",
      { p_poll_id: POLL, p_body: "hola" },
    ]);
  });

  it("toggleComments exige sesión y llama a set_poll_comments", async () => {
    user = null;
    expect(await toggleComments(POLL, true)).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    user = { id: "u1" };
    responses = { "rpc:set_poll_comments": { data: null, error: null } };
    expect(await toggleComments(POLL, true)).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "set_poll_comments",
      { p_poll_id: POLL, p_enabled: true },
    ]);
  });

  it("loadMoreComments devuelve la página siguiente (también a un visitante en cerradas)", async () => {
    user = null;
    responses = { "rpc:list_comments": { data: [], error: null } };
    const r = await loadMoreComments(POLL, "c0");
    expect(r).toEqual({ ok: true, data: { items: [], nextCursor: null } });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "list_comments",
      { p_poll_id: POLL, p_cursor: "c0" },
    ]);
  });

  it("submitCommentReport exige sesión y manda motivo y detalle", async () => {
    user = null;
    expect(await submitCommentReport("c-1", "spam")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    user = { id: "u1" };
    responses = { "rpc:report_comment": { data: null, error: null } };
    await submitCommentReport("c-1", "acoso", "Ofensivo");
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "report_comment",
      { p_comment_id: "c-1", p_reason: "acoso", p_details: "Ofensivo" },
    ]);
  });

  it.each([
    ["postComment", () => postComment(POLL, "hola"), "rpc:add_comment"],
    ["loadMoreComments", () => loadMoreComments(POLL, "c0"), "rpc:list_comments"],
    ["toggleComments", () => toggleComments(POLL, false), "rpc:set_poll_comments"],
    ["submitCommentReport", () => submitCommentReport("c-1", "spam"), "rpc:report_comment"],
  ])("%s: un fallo de red no lanza", async (_name, run, target) => {
    responses = { [target]: networkThrow };
    expect(await run()).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

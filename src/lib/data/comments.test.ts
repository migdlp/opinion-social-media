import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { addComment, createPoll, listComments, setPollComments } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const POLL = "00000000-0000-4000-8000-000000000001";
const row = (n: number) => ({
  comment_id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  username: `user_${n}`,
  display_name: n % 2 ? "Nombre" : null,
  body: `Comentario ${n}`,
  created_at: "2026-10-30T10:00:00+00:00",
  cursor: `2026-10-30T10:00:00.000000Z|${n}`,
});

describe("listComments (CMT-001)", () => {
  it("devuelve los comentarios en el orden de la RPC, sin user_id", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_comments": { data: [row(2), row(1)], error: null },
    });
    const r = await listComments(supabase, POLL, null);

    expect(r).toEqual({
      ok: true,
      data: {
        items: [
          {
            id: row(2).comment_id,
            username: "user_2",
            displayName: null,
            body: "Comentario 2",
            createdAt: "2026-10-30T10:00:00+00:00",
          },
          {
            id: row(1).comment_id,
            username: "user_1",
            displayName: "Nombre",
            body: "Comentario 1",
            createdAt: "2026-10-30T10:00:00+00:00",
          },
        ],
        nextCursor: null,
      },
    });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "list_comments",
      { p_poll_id: POLL, p_cursor: null },
    ]);
  });

  it("la fila 21 sólo indica que hay más: se queda como cursor", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => row(i + 1));
    const { supabase } = fakeSupabase({ "rpc:list_comments": { data: rows, error: null } });
    const r = await listComments(supabase, POLL, "c0");
    expect(r.ok && r.data.items).toHaveLength(20);
    expect(r.ok && r.data.nextCursor).toBe(row(20).cursor);
  });

  it.each(["COMMENTS_DISABLED", "VOTE_REQUIRED", "POLL_UNAVAILABLE", "INVALID_CURSOR"])(
    "propaga %s",
    async (code) => {
      const { supabase } = fakeSupabase({
        "rpc:list_comments": { data: null, error: { code: "P0001", message: code } },
      });
      expect(await listComments(supabase, POLL, null)).toEqual({ ok: false, error: code });
    },
  );

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:list_comments": networkThrow });
    expect(await listComments(supabase, POLL, null)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("addComment y setPollComments (CMT-001)", () => {
  it("addComment llama a la RPC y devuelve el id", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:add_comment": { data: "c-1", error: null } });
    expect(await addComment(supabase, POLL, "Hola")).toEqual({ ok: true, data: { id: "c-1" } });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "add_comment",
      { p_poll_id: POLL, p_body: "Hola" },
    ]);
  });

  it.each([
    "COMMENT_INVALID",
    "COMMENTS_DISABLED",
    "VOTE_REQUIRED",
    "RATE_LIMITED",
    "AUTH_REQUIRED",
    "PROFILE_REQUIRED",
  ])("addComment propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:add_comment": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await addComment(supabase, POLL, "Hola")).toEqual({ ok: false, error: code });
  });

  it("setPollComments llama a la RPC", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:set_poll_comments": { data: null, error: null },
    });
    expect(await setPollComments(supabase, POLL, true)).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "set_poll_comments",
      { p_poll_id: POLL, p_enabled: true },
    ]);
  });

  it("createPoll pide el debate sólo si se activa", async () => {
    const on = fakeSupabase({ "rpc:create_poll": { data: "p-1", error: null } });
    await createPoll(on.supabase, "¿Pregunta válida aquí?", ["Sí", "No"], null, null, true);
    expect(on.queries[0].calls[0][2]).toMatchObject({ p_comments_enabled: true });
    const off = fakeSupabase({ "rpc:create_poll": { data: "p-2", error: null } });
    await createPoll(off.supabase, "¿Pregunta válida aquí?", ["Sí", "No"]);
    expect(off.queries[0].calls[0][2]).not.toHaveProperty("p_comments_enabled");
  });

  it("los códigos nuevos tienen un mensaje para la interfaz", () => {
    for (const code of ["COMMENTS_DISABLED", "VOTE_REQUIRED", "COMMENT_INVALID"] as const) {
      expect(ERROR_MESSAGES[code]).toBeTruthy();
    }
  });
});

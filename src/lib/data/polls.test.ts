import { describe, expect, it } from "vitest";
import {
  FEED_PAGE_SIZE,
  decodeFeedCursor,
  encodeFeedCursor,
  getFeedPolls,
  getOwnVoteOptionId,
  getPublicPoll,
} from "./polls";
import { fakeSupabase as fakeClient } from "./testing/fake-supabase";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function pollRow(
  n: number,
  createdAt = `2026-10-27T10:00:${String(n % 60).padStart(2, "0")}.123456+00:00`,
) {
  return {
    id: uuid(n),
    question: `¿Pregunta número ${n}?`,
    created_at: createdAt,
    closes_at: null as string | null,
    poll_options: [
      { id: uuid(1000 + n * 2), text: "Sí", position: 1 },
      { id: uuid(1001 + n * 2), text: "No", position: 2 },
    ],
  };
}

describe("cursor del feed", () => {
  it("codifica y decodifica created_at con microsegundos e id", () => {
    const cursor = { createdAt: "2026-10-27T10:00:00.123456+00:00", id: uuid(7) };
    const encoded = encodeFeedCursor(cursor);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeFeedCursor(encoded)).toEqual(cursor);
  });

  it("rechaza cursores ilegibles o manipulados", () => {
    expect(decodeFeedCursor(null)).toBeNull();
    expect(decodeFeedCursor("")).toBeNull();
    expect(decodeFeedCursor("no-es-base64-json")).toBeNull();
    const bad = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    expect(decodeFeedCursor(bad({ c: "ayer", i: uuid(1) }))).toBeNull();
    expect(decodeFeedCursor(bad({ c: "2026-10-27T10:00:00+00:00", i: "1,id.gt.0" }))).toBeNull();
    expect(decodeFeedCursor(bad({ c: '2026-10-27T10:00:00+00:00",x', i: uuid(1) }))).toBeNull();
  });
});

describe("getFeedPolls (MVP-018)", () => {
  it("pide sólo columnas públicas, orden estable y un elemento de más", async () => {
    const { supabase, queries } = fakeClient({ polls: { data: [], error: null } });
    await getFeedPolls(supabase);

    expect(queries).toHaveLength(1);
    const [{ target, calls }] = queries;
    expect(target).toBe("polls");
    const select = calls.find(([m]) => m === "select")?.[1] as string;
    expect(select.replace(/\s/g, "")).toBe(
      "id,question,created_at,closes_at,poll_options(id,text,position)",
    );
    expect(select).not.toMatch(/user_id|status|votes|\*/);
    expect(calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(calls).toContainEqual(["order", "id", { ascending: false }]);
    expect(calls).toContainEqual([
      "order",
      "position",
      { referencedTable: "poll_options", ascending: true },
    ]);
    expect(calls).toContainEqual(["limit", FEED_PAGE_SIZE + 1]);
    expect(calls.some(([m]) => m === "or")).toBe(false);
  });

  it("con más de veinte devuelve veinte y un cursor del último entregado", async () => {
    const rows = Array.from({ length: FEED_PAGE_SIZE + 1 }, (_, i) => pollRow(i + 1));
    const { supabase } = fakeClient({ polls: { data: rows, error: null } });
    const result = await getFeedPolls(supabase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.polls).toHaveLength(FEED_PAGE_SIZE);
    const last = rows[FEED_PAGE_SIZE - 1];
    expect(decodeFeedCursor(result.data.nextCursor)).toEqual({
      createdAt: last.created_at,
      id: last.id,
    });
    expect(result.data.polls[0]).toEqual({
      id: rows[0].id,
      question: rows[0].question,
      createdAt: rows[0].created_at,
      closesAt: null,
      options: rows[0].poll_options,
    });
  });

  it("sin más resultados no devuelve cursor", async () => {
    const { supabase } = fakeClient({ polls: { data: [pollRow(1), pollRow(2)], error: null } });
    const result = await getFeedPolls(supabase);
    expect(result).toMatchObject({ ok: true, data: { nextCursor: null } });
    if (result.ok) expect(result.data.polls).toHaveLength(2);
  });

  it("con cursor continúa tras (created_at, id) y desempata por UUID", async () => {
    const cursor = encodeFeedCursor({ createdAt: "2026-10-27T10:00:00.123456+00:00", id: uuid(9) });
    const { supabase, queries } = fakeClient({ polls: { data: [], error: null } });
    await getFeedPolls(supabase, cursor);

    expect(queries[0].calls).toContainEqual([
      "or",
      `created_at.lt."2026-10-27T10:00:00.123456+00:00",and(created_at.eq."2026-10-27T10:00:00.123456+00:00",id.lt.${uuid(9)})`,
    ]);
  });

  it("un cursor ilegible sirve la primera página", async () => {
    const { supabase, queries } = fakeClient({ polls: { data: [], error: null } });
    await getFeedPolls(supabase, "basura");
    expect(queries[0].calls.some(([m]) => m === "or")).toBe(false);
  });

  it("ordena las opciones por posición aunque lleguen desordenadas", async () => {
    const row = pollRow(1);
    row.poll_options.reverse();
    const { supabase } = fakeClient({ polls: { data: [row], error: null } });
    const result = await getFeedPolls(supabase);
    if (!result.ok) throw new Error("debería ser ok");
    expect(result.data.polls[0].options.map((o) => o.position)).toEqual([1, 2]);
  });

  it("un error de la consulta se devuelve como código controlado", async () => {
    const { supabase } = fakeClient({
      polls: { data: null, error: { code: "PGRST000", message: "boom" } },
    });
    expect(await getFeedPolls(supabase)).toEqual({ ok: false, error: "UNKNOWN" });
  });
});

describe("getPublicPoll (MVP-019)", () => {
  it("devuelve la encuesta publicada con opciones en orden, sin datos del autor", async () => {
    const row = pollRow(3);
    const { supabase, queries } = fakeClient({ polls: { data: row, error: null } });
    const result = await getPublicPoll(supabase, row.id);

    expect(result).toEqual({
      ok: true,
      data: {
        id: row.id,
        question: row.question,
        createdAt: row.created_at,
        closesAt: null,
        options: row.poll_options,
      },
    });
    const { calls } = queries[0];
    const select = calls.find(([m]) => m === "select")?.[1] as string;
    expect(select.replace(/\s/g, "")).toBe(
      "id,question,created_at,closes_at,poll_options(id,text,position)",
    );
    expect(calls).toContainEqual(["eq", "id", row.id]);
    expect(calls.some(([m]) => m === "maybeSingle")).toBe(true);
  });

  it("inexistente u oculta (RLS no devuelve fila) → POLL_UNAVAILABLE", async () => {
    const { supabase } = fakeClient({ polls: { data: null, error: null } });
    expect(await getPublicPoll(supabase, uuid(4))).toEqual({
      ok: false,
      error: "POLL_UNAVAILABLE",
    });
  });

  it("ID inválido → POLL_UNAVAILABLE sin consultar", async () => {
    const { supabase, queries } = fakeClient({});
    for (const id of ["abc", "", "1 or 1=1", `${uuid(1)}x`]) {
      expect(await getPublicPoll(supabase, id)).toEqual({ ok: false, error: "POLL_UNAVAILABLE" });
    }
    expect(queries).toHaveLength(0);
  });
});

describe("getOwnVoteOptionId (MVP-019)", () => {
  it("recupera la opción votada por la sesión actual", async () => {
    const { supabase, queries } = fakeClient({
      votes: { data: { option_id: uuid(20) }, error: null },
    });
    expect(await getOwnVoteOptionId(supabase, uuid(3))).toEqual({ ok: true, data: uuid(20) });
    const { target, calls } = queries[0];
    expect(target).toBe("votes");
    expect(calls).toContainEqual(["select", "option_id"]);
    expect(calls).toContainEqual(["eq", "poll_id", uuid(3)]);
  });

  it("sin voto devuelve null", async () => {
    const { supabase } = fakeClient({ votes: { data: null, error: null } });
    expect(await getOwnVoteOptionId(supabase, uuid(3))).toEqual({ ok: true, data: null });
  });

  it("ID inválido devuelve null sin consultar", async () => {
    const { supabase, queries } = fakeClient({});
    expect(await getOwnVoteOptionId(supabase, "abc")).toEqual({ ok: true, data: null });
    expect(queries).toHaveLength(0);
  });

  it("sin permiso (anon) → AUTH_REQUIRED", async () => {
    const { supabase } = fakeClient({
      votes: { data: null, error: { code: "42501", message: "denied" } },
    });
    expect(await getOwnVoteOptionId(supabase, uuid(3))).toEqual({
      ok: false,
      error: "AUTH_REQUIRED",
    });
  });
});

describe("closes_at (V2-013)", () => {
  it("pide la columna y la devuelve como closesAt", async () => {
    const closing = { ...pollRow(1), closes_at: "2026-10-28T10:00:00+00:00" };
    const { supabase, queries } = fakeClient({
      polls: { data: [closing, pollRow(2)], error: null },
    });
    const res = await getFeedPolls(supabase);
    const select = queries[0].calls.find(([m]) => m === "select")?.[1] as string;
    expect(select).toBe("id, question, created_at, closes_at, poll_options(id, text, position)");
    expect(res.ok && res.data.polls.map((p) => p.closesAt)).toEqual([
      "2026-10-28T10:00:00+00:00",
      null,
    ]);
  });
});

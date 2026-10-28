import { describe, expect, it } from "vitest";
import {
  createPoll,
  getFeedPage,
  getMyProfile,
  getPollDetail,
  getPollResults,
  reportPoll,
  upsertMyProfile,
  votePoll,
} from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const P1 = uuid(1);
const P2 = uuid(2);
const A = uuid(11);
const B = uuid(12);

const pollRow = (id: string) => ({
  id,
  question: "¿Pregunta de prueba?",
  created_at: "2026-10-27T10:00:00.123456+00:00",
  poll_options: [
    { id: A, text: "Sí", position: 1 },
    { id: B, text: "No", position: 2 },
  ],
});

const resultRows = [
  {
    option_id: A,
    position: 1,
    text: "Sí",
    votes: 2,
    percentage: 66.7,
    total_votes: 3,
    my_option_id: B,
  },
  {
    option_id: B,
    position: 2,
    text: "No",
    votes: 1,
    percentage: 33.3,
    total_votes: 3,
    my_option_id: B,
  },
];

const results = {
  pollId: P1,
  totalVotes: 3,
  myOptionId: B,
  options: [
    { id: A, text: "Sí", position: 1, votes: 2, percentage: 66.7 },
    { id: B, text: "No", position: 2, votes: 1, percentage: 33.3 },
  ],
};

const rpcError = (message: string) => ({ data: null, error: { code: "P0001", message } });

describe("getPollResults", () => {
  it("llama a la RPC y transforma las filas en PollResults", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:get_poll_results": { data: resultRows, error: null },
    });
    expect(await getPollResults(supabase, P1)).toEqual({ ok: true, data: results });
    expect(queries[0].calls[0]).toEqual(["rpc", "get_poll_results", { p_poll_id: P1 }]);
  });

  it.each(["NOT_VOTED", "POLL_UNAVAILABLE", "AUTH_REQUIRED"])(
    "propaga %s como código",
    async (code) => {
      const { supabase } = fakeSupabase({ "rpc:get_poll_results": rpcError(code) });
      expect(await getPollResults(supabase, P1)).toEqual({ ok: false, error: code });
    },
  );

  it("ID inválido → POLL_UNAVAILABLE sin llamar", async () => {
    const { supabase, queries } = fakeSupabase({});
    expect(await getPollResults(supabase, "abc")).toEqual({ ok: false, error: "POLL_UNAVAILABLE" });
    expect(queries).toHaveLength(0);
  });
});

describe("votePoll", () => {
  it("vota y devuelve los resultados autorizados", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:vote_poll": { data: { poll_id: P1, option_id: B, created_at: "x" }, error: null },
      "rpc:get_poll_results": { data: resultRows, error: null },
    });
    expect(await votePoll(supabase, P1, B)).toEqual({ ok: true, data: results });
    expect(queries.map((q) => q.calls[0])).toEqual([
      ["rpc", "vote_poll", { p_poll_id: P1, p_option_id: B }],
      ["rpc", "get_poll_results", { p_poll_id: P1 }],
    ]);
  });

  it("ALREADY_VOTED pasa a estado votado con los resultados", async () => {
    const { supabase } = fakeSupabase({
      "rpc:vote_poll": rpcError("ALREADY_VOTED"),
      "rpc:get_poll_results": { data: resultRows, error: null },
    });
    expect(await votePoll(supabase, P1, A)).toEqual({ ok: true, data: results });
  });

  it.each(["OPTION_INVALID", "POLL_UNAVAILABLE", "AUTH_REQUIRED"])(
    "%s no pide resultados",
    async (code) => {
      const { supabase, queries } = fakeSupabase({ "rpc:vote_poll": rpcError(code) });
      expect(await votePoll(supabase, P1, A)).toEqual({ ok: false, error: code });
      expect(queries).toHaveLength(1);
    },
  );

  it("caída de red al votar → NETWORK_ERROR (la UI reconcilia antes de reintentar)", async () => {
    const { supabase } = fakeSupabase({ "rpc:vote_poll": networkThrow });
    expect(await votePoll(supabase, P1, A)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("createPoll", () => {
  it("llama a create_poll con los argumentos del contrato y devuelve el id", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:create_poll": { data: P2, error: null } });
    expect(await createPoll(supabase, "¿Pregunta?", ["Sí", "No"])).toEqual({
      ok: true,
      data: { id: P2 },
    });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "create_poll",
      { p_question: "¿Pregunta?", p_options: ["Sí", "No"] },
    ]);
  });

  it("con fecha de cierre añade p_closes_at; sin ella no lo envía", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:create_poll": { data: P2, error: null } });
    await createPoll(supabase, "¿Pregunta?", ["Sí", "No"], "2026-10-28T10:00:00.000Z");
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "create_poll",
      {
        p_question: "¿Pregunta?",
        p_options: ["Sí", "No"],
        p_closes_at: "2026-10-28T10:00:00.000Z",
      },
    ]);
  });

  it.each(["INVALID_CLOSES_AT", "RATE_LIMITED", "VALIDATION_OPTION_DUPLICATE", "AUTH_REQUIRED"])(
    "propaga %s",
    async (code) => {
      const { supabase } = fakeSupabase({ "rpc:create_poll": rpcError(code) });
      expect(await createPoll(supabase, "¿Pregunta?", ["Sí", "No"])).toEqual({
        ok: false,
        error: code,
      });
    },
  );

  it("un error interno no llega a la UI con detalles", async () => {
    const { supabase } = fakeSupabase({
      "rpc:create_poll": {
        data: null,
        error: { code: "XX000", message: 'relation "x" does not exist' },
      },
    });
    expect(await createPoll(supabase, "¿Pregunta?", ["Sí", "No"])).toEqual({
      ok: false,
      error: "UNKNOWN",
    });
  });
});

describe("getPollDetail", () => {
  it("visitante: encuesta sin consultar votos ni resultados", async () => {
    const { supabase, queries } = fakeSupabase({ polls: { data: pollRow(P1), error: null } });
    const r = await getPollDetail(supabase, P1, { signedIn: false });
    expect(r).toMatchObject({
      ok: true,
      data: { poll: { id: P1 }, viewer: { kind: "anonymous" } },
    });
    expect(queries.map((q) => q.target)).toEqual(["polls", "rpc:get_poll_authors"]);
  });

  it("con sesión y sin voto: not_voted, sin pedir resultados", async () => {
    const { supabase, queries } = fakeSupabase({
      polls: { data: pollRow(P1), error: null },
      votes: { data: null, error: null },
    });
    const r = await getPollDetail(supabase, P1, { signedIn: true });
    expect(r).toMatchObject({ ok: true, data: { viewer: { kind: "not_voted" } } });
    expect(queries.map((q) => q.target)).toEqual(["polls", "rpc:get_poll_authors", "votes"]);
  });

  it("con sesión y voto: voted con resultados", async () => {
    const { supabase } = fakeSupabase({
      polls: { data: pollRow(P1), error: null },
      votes: { data: { option_id: B }, error: null },
      "rpc:get_poll_results": { data: resultRows, error: null },
    });
    const r = await getPollDetail(supabase, P1, { signedIn: true });
    expect(r).toEqual({
      ok: true,
      data: {
        poll: {
          id: P1,
          question: "¿Pregunta de prueba?",
          createdAt: pollRow(P1).created_at,
          author: null,
          options: pollRow(P1).poll_options,
        },
        viewer: { kind: "voted", results },
      },
    });
  });

  it("no disponible → POLL_UNAVAILABLE", async () => {
    const { supabase } = fakeSupabase({ polls: { data: null, error: null } });
    expect(await getPollDetail(supabase, P1, { signedIn: true })).toEqual({
      ok: false,
      error: "POLL_UNAVAILABLE",
    });
  });

  it("sesión caducada al leer el voto: se muestra como visitante", async () => {
    const { supabase } = fakeSupabase({
      polls: { data: pollRow(P1), error: null },
      votes: { data: null, error: { code: "PGRST303", message: "JWT expired" } },
    });
    expect(await getPollDetail(supabase, P1, { signedIn: true })).toMatchObject({
      ok: true,
      data: { viewer: { kind: "anonymous" } },
    });
  });
});

describe("getFeedPage", () => {
  it("visitante: tarjetas anónimas sin consultar votos", async () => {
    const { supabase, queries } = fakeSupabase({
      polls: { data: [pollRow(P1), pollRow(P2)], error: null },
    });
    const r = await getFeedPage(supabase, null, { signedIn: false });
    expect(r).toMatchObject({
      ok: true,
      data: {
        nextCursor: null,
        items: [{ viewer: { kind: "anonymous" } }, { viewer: { kind: "anonymous" } }],
      },
    });
    expect(queries.map((q) => q.target)).toEqual(["polls", "rpc:get_poll_authors"]);
  });

  it("con sesión: una consulta de votos propios para todo el lote y resultados sólo de las votadas", async () => {
    const { supabase, queries } = fakeSupabase({
      polls: { data: [pollRow(P1), pollRow(P2)], error: null },
      votes: { data: [{ poll_id: P1, option_id: B }], error: null },
      "rpc:get_poll_results": { data: resultRows, error: null },
    });
    const r = await getFeedPage(supabase, null, { signedIn: true });
    expect(r).toMatchObject({
      ok: true,
      data: {
        items: [
          { poll: { id: P1 }, viewer: { kind: "voted", results } },
          { poll: { id: P2 }, viewer: { kind: "not_voted" } },
        ],
      },
    });
    const votes = queries.find((q) => q.target === "votes")!;
    expect(votes.calls).toContainEqual(["select", "poll_id, option_id"]);
    expect(votes.calls).toContainEqual(["in", "poll_id", [P1, P2]]);
    expect(queries.filter((q) => q.target === "rpc:get_poll_results")).toHaveLength(1);
  });

  it("feed vacío con sesión no consulta votos", async () => {
    const { supabase, queries } = fakeSupabase({ polls: { data: [], error: null } });
    expect(await getFeedPage(supabase, null, { signedIn: true })).toEqual({
      ok: true,
      data: { items: [], nextCursor: null },
    });
    expect(queries.map((q) => q.target)).toEqual(["polls"]);
  });

  it("caída de red al cargar el feed → NETWORK_ERROR", async () => {
    const { supabase } = fakeSupabase({ polls: networkThrow });
    expect(await getFeedPage(supabase, null, { signedIn: false })).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });
});

describe("reportPoll (V2-020)", () => {
  it("llama a report_poll con motivo y detalle y devuelve ok", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:report_poll": { data: null, error: null } });
    expect(await reportPoll(supabase, P1, "spam", "Es publicidad")).toEqual({
      ok: true,
      data: undefined,
    });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "report_poll",
      { p_poll_id: P1, p_reason: "spam", p_details: "Es publicidad" },
    ]);
  });

  it("sin detalle envía p_details null", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:report_poll": { data: null, error: null } });
    await reportPoll(supabase, P1, "otro");
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "report_poll",
      { p_poll_id: P1, p_reason: "otro", p_details: null },
    ]);
  });

  it.each(["ALREADY_REPORTED", "REPORT_RATE_LIMITED", "REPORT_INVALID", "POLL_UNAVAILABLE"])(
    "propaga %s",
    async (code) => {
      const { supabase } = fakeSupabase({ "rpc:report_poll": rpcError(code) });
      expect(await reportPoll(supabase, P1, "spam")).toEqual({ ok: false, error: code });
    },
  );

  it("una caída de red es NETWORK_ERROR", async () => {
    const { supabase } = fakeSupabase({ "rpc:report_poll": networkThrow });
    expect(await reportPoll(supabase, P1, "spam")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("perfil propio (V2-002)", () => {
  it("getMyProfile devuelve el perfil o null si aún no hay", async () => {
    const withProfile = fakeSupabase({
      "rpc:get_my_profile": {
        data: [{ username: "ana_23", display_name: "Ana", is_private: false }],
        error: null,
      },
    });
    expect(await getMyProfile(withProfile.supabase)).toEqual({
      ok: true,
      data: { username: "ana_23", displayName: "Ana", isPrivate: false },
    });
    expect(withProfile.queries[0].calls[0]).toEqual(["rpc", "get_my_profile", undefined]);

    const none = fakeSupabase({ "rpc:get_my_profile": { data: [], error: null } });
    expect(await getMyProfile(none.supabase)).toEqual({ ok: true, data: null });
  });

  it("getMyProfile propaga AUTH_REQUIRED y los fallos de red", async () => {
    const auth = fakeSupabase({ "rpc:get_my_profile": rpcError("AUTH_REQUIRED") });
    expect(await getMyProfile(auth.supabase)).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    const net = fakeSupabase({ "rpc:get_my_profile": networkThrow });
    expect(await getMyProfile(net.supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });

  it("upsertMyProfile llama a upsert_my_profile y devuelve el perfil", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:upsert_my_profile": {
        data: [{ username: "ana_23", display_name: null, is_private: false, created_at: "x" }],
        error: null,
      },
    });
    expect(await upsertMyProfile(supabase, "Ana_23", null)).toEqual({
      ok: true,
      data: { username: "ana_23", displayName: null, isPrivate: false },
    });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "upsert_my_profile",
      { p_username: "Ana_23", p_display_name: null },
    ]);
  });

  it.each(["USERNAME_TAKEN", "USERNAME_INVALID", "USERNAME_RESERVED", "DISPLAY_NAME_INVALID"])(
    "upsertMyProfile propaga %s",
    async (code) => {
      const { supabase } = fakeSupabase({ "rpc:upsert_my_profile": rpcError(code) });
      expect(await upsertMyProfile(supabase, "ana", null)).toEqual({ ok: false, error: code });
    },
  );
});

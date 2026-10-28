import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const votePoll = vi.fn();
const getPollDetail = vi.fn();
vi.mock("@/lib/data/operations", () => ({ votePoll, getPollDetail }));

const { castVote, loadOwnVote } = await import("./vote-actions");

const RESULTS = { pollId: "p", totalVotes: 1, myOptionId: "o", options: [] };

beforeEach(() => {
  getUser.mockReset();
  votePoll.mockReset();
  getPollDetail.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  votePoll.mockResolvedValue({ ok: true, data: RESULTS });
});

describe("castVote", () => {
  it("con sesión envía sólo la opción elegida y devuelve los resultados", async () => {
    const res = await castVote("p", "o");

    expect(votePoll).toHaveBeenCalledOnce();
    expect(votePoll.mock.calls[0].slice(1)).toEqual(["p", "o"]);
    expect(res).toEqual({ ok: true, data: RESULTS });
  });

  it("sin sesión no emite ningún voto y pide autenticación", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await castVote("p", "o")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(votePoll).not.toHaveBeenCalled();
  });

  it("si Supabase no responde devuelve un error controlado, sin lanzar", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));

    expect(await castVote("p", "o")).toEqual({ ok: false, error: "NETWORK_ERROR" });
    expect(votePoll).not.toHaveBeenCalled();
  });
});

describe("loadOwnVote", () => {
  it("devuelve los resultados si el usuario ya votó", async () => {
    getPollDetail.mockResolvedValue({
      ok: true,
      data: { poll: {}, viewer: { kind: "voted", results: RESULTS } },
    });

    expect(await loadOwnVote("p")).toEqual({ ok: true, data: RESULTS });
  });

  it("devuelve null si no ha votado", async () => {
    getPollDetail.mockResolvedValue({
      ok: true,
      data: { poll: {}, viewer: { kind: "not_voted" } },
    });

    expect(await loadOwnVote("p")).toEqual({ ok: true, data: null });
  });

  it("propaga el error de red sin lanzar", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));

    expect(await loadOwnVote("p")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

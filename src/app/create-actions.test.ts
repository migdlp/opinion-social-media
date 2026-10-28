import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const createPoll = vi.fn();
const getFeedPage = vi.fn();
vi.mock("@/lib/data/operations", () => ({ createPoll, getFeedPage }));

const { publishPoll, findPublishedPoll } = await import("./create-actions");

beforeEach(() => {
  getUser.mockReset();
  createPoll.mockReset();
  getFeedPage.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  createPoll.mockResolvedValue({ ok: true, data: { id: "p1" } });
});

describe("publishPoll", () => {
  it("con sesión crea la encuesta una sola vez y devuelve su id", async () => {
    const res = await publishPoll("¿Qué tomas por la mañana?", ["Café", "Té"]);

    expect(createPoll).toHaveBeenCalledOnce();
    expect(createPoll.mock.calls[0].slice(1)).toEqual([
      "¿Qué tomas por la mañana?",
      ["Café", "Té"],
      undefined,
      undefined,
    ]);
    expect(res).toEqual({ ok: true, data: { id: "p1" } });
  });

  it("pasa la fecha de cierre elegida a create_poll", async () => {
    await publishPoll("¿Qué tomas por la mañana?", ["Café", "Té"], "2026-10-28T10:00:00.000Z");

    expect(createPoll.mock.calls[0].slice(1)).toEqual([
      "¿Qué tomas por la mañana?",
      ["Café", "Té"],
      "2026-10-28T10:00:00.000Z",
      undefined,
    ]);
  });

  it("pasa la categoría elegida a create_poll", async () => {
    await publishPoll("¿Qué tomas por la mañana?", ["Café", "Té"], undefined, "ciencia");

    expect(createPoll.mock.calls[0].slice(1)).toEqual([
      "¿Qué tomas por la mañana?",
      ["Café", "Té"],
      undefined,
      "ciencia",
    ]);
  });

  it("sin sesión no llega a la base de datos y pide autenticación", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await publishPoll("¿Una pregunta válida?", ["a", "b"])).toEqual({
      ok: false,
      error: "AUTH_REQUIRED",
    });
    expect(createPoll).not.toHaveBeenCalled();
  });

  it("propaga la cuota agotada como error controlado", async () => {
    createPoll.mockResolvedValue({ ok: false, error: "RATE_LIMITED" });

    expect(await publishPoll("¿Una pregunta válida?", ["a", "b"])).toEqual({
      ok: false,
      error: "RATE_LIMITED",
    });
  });

  it("si Supabase no responde devuelve un error de red, sin lanzar", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));

    expect(await publishPoll("¿Una pregunta válida?", ["a", "b"])).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });
});

describe("findPublishedPoll", () => {
  const poll = (over = {}) => ({
    id: "p7",
    question: "¿Una pregunta válida?",
    createdAt: new Date().toISOString(),
    options: [
      { id: "1", text: "a", position: 1 },
      { id: "2", text: "b", position: 2 },
    ],
    ...over,
  });
  const feed = (...polls: object[]) => ({
    ok: true,
    data: {
      items: polls.map((p) => ({ poll: p, viewer: { kind: "not_voted" } })),
      nextCursor: null,
    },
  });

  it("encuentra la encuesta recién publicada con la misma pregunta y opciones", async () => {
    getFeedPage.mockResolvedValue(feed(poll({ id: "otra", question: "Otra" }), poll()));

    expect(await findPublishedPoll("¿Una pregunta válida?", ["a", "b"])).toEqual({
      ok: true,
      data: { id: "p7" },
    });
  });

  it("no confunde una encuesta antigua con la que se intentaba publicar", async () => {
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    getFeedPage.mockResolvedValue(feed(poll({ createdAt: old })));

    expect(await findPublishedPoll("¿Una pregunta válida?", ["a", "b"])).toEqual({
      ok: true,
      data: null,
    });
  });

  it("si las opciones difieren devuelve null", async () => {
    getFeedPage.mockResolvedValue(feed(poll()));

    expect(await findPublishedPoll("¿Una pregunta válida?", ["a", "c"])).toEqual({
      ok: true,
      data: null,
    });
  });

  it("sin sesión pide autenticación y con red caída devuelve error controlado", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await findPublishedPoll("x", ["a", "b"])).toEqual({ ok: false, error: "AUTH_REQUIRED" });

    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await findPublishedPoll("x", ["a", "b"])).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

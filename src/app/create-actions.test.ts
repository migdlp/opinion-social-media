import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const createPoll = vi.fn();
vi.mock("@/lib/data/operations", () => ({ createPoll }));

const { publishPoll } = await import("./create-actions");

beforeEach(() => {
  getUser.mockReset();
  createPoll.mockReset();
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
    ]);
    expect(res).toEqual({ ok: true, data: { id: "p1" } });
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

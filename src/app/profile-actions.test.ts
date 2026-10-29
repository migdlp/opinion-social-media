import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const setVoteVisibility = vi.fn();
const setProfilePrivacy = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/data/operations", () => ({
  setVoteVisibility,
  setProfilePrivacy,
  upsertMyProfile: vi.fn(),
}));

const { saveVoteVisibility, savePrivacy } = await import("./profile-actions");

beforeEach(() => {
  getUser.mockReset();
  setVoteVisibility.mockReset();
  setProfilePrivacy.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

describe("saveVoteVisibility (PRIV-002)", () => {
  it("sin sesión no llega a la base de datos", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await saveVoteVisibility("followers")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(setVoteVisibility).not.toHaveBeenCalled();
  });

  it("guarda la audiencia elegida y devuelve el resultado", async () => {
    setVoteVisibility.mockResolvedValue({ ok: true, data: undefined });
    expect(await saveVoteVisibility("followers")).toEqual({ ok: true, data: undefined });
    expect(setVoteVisibility).toHaveBeenCalledWith(expect.anything(), "followers");
  });

  it("propaga el error de la base de datos", async () => {
    setVoteVisibility.mockResolvedValue({ ok: false, error: "PROFILE_REQUIRED" });
    expect(await saveVoteVisibility("private")).toEqual({ ok: false, error: "PROFILE_REQUIRED" });
  });

  it("nunca lanza", async () => {
    setVoteVisibility.mockRejectedValue(new TypeError("fetch failed"));
    expect((await saveVoteVisibility("profile")).ok).toBe(false);
  });

  it("no toca la privacidad de la cuenta", async () => {
    setVoteVisibility.mockResolvedValue({ ok: true, data: undefined });
    await saveVoteVisibility("private");
    expect(setProfilePrivacy).not.toHaveBeenCalled();
  });
});

describe("savePrivacy (V2-008)", () => {
  it("sin sesión devuelve AUTH_REQUIRED", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await savePrivacy(true)).toEqual({ ok: false, error: "AUTH_REQUIRED" });
  });
});

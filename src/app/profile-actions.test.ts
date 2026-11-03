import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const setVoteVisibility = vi.fn();
const setProfilePrivacy = vi.fn();
const setProfileAvatar = vi.fn();
const setProfileBio = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/data/operations", () => ({
  setVoteVisibility,
  setProfilePrivacy,
  setProfileAvatar,
  setProfileBio,
  upsertMyProfile: vi.fn(),
}));

const { saveVoteVisibility, savePrivacy, saveAvatar, saveBio } = await import("./profile-actions");

beforeEach(() => {
  getUser.mockReset();
  setVoteVisibility.mockReset();
  setProfilePrivacy.mockReset();
  setProfileAvatar.mockReset();
  setProfileBio.mockReset();
  setProfileBio.mockResolvedValue({ ok: true, data: undefined });
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

describe("saveAvatar (AVATAR-001)", () => {
  it("sin sesión no llega a la base de datos", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await saveAvatar("sol")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(setProfileAvatar).not.toHaveBeenCalled();
  });

  it("guarda el icono o null (iniciales) y devuelve el resultado", async () => {
    setProfileAvatar.mockResolvedValue({ ok: true, data: undefined });
    expect(await saveAvatar("sol")).toEqual({ ok: true, data: undefined });
    expect(setProfileAvatar).toHaveBeenLastCalledWith(expect.anything(), "sol");
    await saveAvatar(null);
    expect(setProfileAvatar).toHaveBeenLastCalledWith(expect.anything(), null);
  });

  it("propaga el rechazo del backend y nunca lanza", async () => {
    setProfileAvatar.mockResolvedValue({ ok: false, error: "AVATAR_INVALID" });
    expect(await saveAvatar("sol")).toEqual({ ok: false, error: "AVATAR_INVALID" });
    setProfileAvatar.mockRejectedValue(new TypeError("fetch failed"));
    expect((await saveAvatar("sol")).ok).toBe(false);
  });
});

describe("saveBio (PROFILE-002)", () => {
  it("con sesión guarda la descripción una vez; null la quita", async () => {
    expect(await saveBio("Hola")).toEqual({ ok: true, data: undefined });
    expect(setProfileBio).toHaveBeenCalledOnce();
    expect(setProfileBio.mock.calls[0][1]).toBe("Hola");
    await saveBio(null);
    expect(setProfileBio.mock.calls[1][1]).toBeNull();
  });

  it("sin sesión no llega a la base de datos", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await saveBio("Hola")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(setProfileBio).not.toHaveBeenCalled();
  });

  it("propaga BIO_INVALID y un fallo de red no lanza", async () => {
    setProfileBio.mockResolvedValue({ ok: false, error: "BIO_INVALID" });
    expect(await saveBio("x")).toEqual({ ok: false, error: "BIO_INVALID" });
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await saveBio("x")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

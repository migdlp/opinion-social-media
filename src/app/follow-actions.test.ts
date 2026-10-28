import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const followUser = vi.fn();
const unfollowUser = vi.fn();
const getProfilePolls = vi.fn();
const getProfileVotes = vi.fn();
vi.mock("@/lib/data/operations", () => ({
  followUser,
  unfollowUser,
  getProfilePolls,
  getProfileVotes,
}));

const { followAction, unfollowAction, loadMoreProfilePolls, loadMoreProfileVotes } =
  await import("./follow-actions");

beforeEach(() => {
  for (const m of [getUser, followUser, unfollowUser, getProfilePolls, getProfileVotes])
    m.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  followUser.mockResolvedValue({ ok: true, data: "accepted" });
  unfollowUser.mockResolvedValue({ ok: true, data: undefined });
  getProfilePolls.mockResolvedValue({ ok: true, data: { items: [], nextCursor: null } });
  getProfileVotes.mockResolvedValue({ ok: true, data: { votes: [], nextCursor: null } });
});

describe("followAction / unfollowAction", () => {
  it("con sesión siguen y dejan de seguir una vez", async () => {
    expect(await followAction("perfil_b")).toEqual({ ok: true, data: "accepted" });
    expect(followUser.mock.calls[0].slice(1)).toEqual(["perfil_b"]);
    expect(await unfollowAction("perfil_b")).toEqual({ ok: true, data: undefined });
    expect(unfollowUser.mock.calls[0].slice(1)).toEqual(["perfil_b"]);
  });

  it("sin sesión no llegan a la base de datos", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await followAction("x")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(await unfollowAction("x")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(followUser).not.toHaveBeenCalled();
    expect(unfollowUser).not.toHaveBeenCalled();
  });

  it("una caída de red es un error controlado", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await followAction("x")).toEqual({ ok: false, error: "NETWORK_ERROR" });
    expect(await unfollowAction("x")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("lecturas paginadas", () => {
  it("las encuestas creadas se leen con el estado de la sesión", async () => {
    await loadMoreProfilePolls("perfil_b", "c1");
    expect(getProfilePolls.mock.calls[0].slice(1)).toEqual(["perfil_b", "c1", { signedIn: true }]);
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await loadMoreProfilePolls("perfil_b", "c1");
    expect(getProfilePolls.mock.calls[1][3]).toEqual({ signedIn: false });
  });

  it("los votos se leen con el cursor", async () => {
    await loadMoreProfileVotes("perfil_b", "c2");
    expect(getProfileVotes.mock.calls[0].slice(1)).toEqual(["perfil_b", "c2"]);
  });

  it("no lanzan ante una caída de red", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    getProfileVotes.mockRejectedValue(new TypeError("fetch failed"));
    expect(await loadMoreProfilePolls("x", "c")).toEqual({ ok: false, error: "NETWORK_ERROR" });
    expect(await loadMoreProfileVotes("x", "c")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

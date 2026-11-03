import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const blockUser = vi.fn();
const unblockUser = vi.fn();
const listBlockedUsers = vi.fn();
vi.mock("@/lib/data/operations", () => ({ blockUser, unblockUser, listBlockedUsers }));

const { blockAction, unblockAction, loadMoreBlocked } = await import("./block-actions");

beforeEach(() => {
  getUser.mockReset();
  blockUser.mockReset();
  unblockUser.mockReset();
  listBlockedUsers.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  blockUser.mockResolvedValue({ ok: true, data: undefined });
  unblockUser.mockResolvedValue({ ok: true, data: undefined });
});

describe.each([
  ["blockAction", blockAction, blockUser],
  ["unblockAction", unblockAction, unblockUser],
])("%s", (_name, action, operation) => {
  it("con sesión llama a la operación una vez con el @usuario", async () => {
    expect(await action("ana")).toEqual({ ok: true, data: undefined });
    expect(operation).toHaveBeenCalledOnce();
    expect(operation.mock.calls[0][1]).toBe("ana");
  });

  it("sin sesión no llega a la base de datos", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await action("ana")).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    expect(operation).not.toHaveBeenCalled();
  });

  it("un fallo de red se devuelve como error controlado, sin lanzar", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));
    expect(await action("ana")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("loadMoreBlocked", () => {
  it("pide la siguiente página con el cursor", async () => {
    listBlockedUsers.mockResolvedValue({ ok: true, data: { users: [], nextCursor: null } });
    await loadMoreBlocked("c1");
    expect(listBlockedUsers.mock.calls[0][1]).toBe("c1");
  });

  it("un fallo de red no lanza", async () => {
    listBlockedUsers.mockRejectedValue(new TypeError("fetch failed"));
    expect(await loadMoreBlocked("c1")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

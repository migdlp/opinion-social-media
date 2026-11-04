import { describe, expect, it } from "vitest";
import { searchUsers } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const row = (n: number, extra: object = {}) => ({
  username: `user_${n}`,
  display_name: n % 2 ? `Nombre ${n}` : null,
  avatar_icon: null,
  is_private: false,
  cursor: `2|user_${n}|hash`,
  ...extra,
});

describe("searchUsers (SEARCH-003)", () => {
  it("llama a search_users con la consulta y el cursor y traduce las filas sin ids internos", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:search_users": {
        data: [
          row(1, { avatar_icon: "sol" }),
          row(2, { is_private: true }),
          row(3, { avatar_icon: "no-existe" }),
        ],
        error: null,
      },
    });
    const result = await searchUsers(supabase, "@ana", "1|ana|hash");
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "search_users",
      { p_query: "@ana", p_cursor: "1|ana|hash" },
    ]);
    expect(result).toEqual({
      ok: true,
      data: {
        users: [
          { username: "user_1", displayName: "Nombre 1", avatarIcon: "sol", isPrivate: false },
          { username: "user_2", displayName: null, avatarIcon: null, isPrivate: true },
          { username: "user_3", displayName: "Nombre 3", avatarIcon: null, isPrivate: false },
        ],
        nextCursor: null,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/user_id|bio/);
  });

  it("sin cursor envía null; con 21 filas devuelve 20 y el cursor de la 20ª", async () => {
    const rows = Array.from({ length: 21 }, (_, n) => row(n));
    const { supabase, queries } = fakeSupabase({
      "rpc:search_users": { data: rows, error: null },
    });
    const result = await searchUsers(supabase, "user");
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "search_users",
      { p_query: "user", p_cursor: null },
    ]);
    expect(result.ok && result.data.users).toHaveLength(20);
    expect(result.ok && result.data.nextCursor).toBe("2|user_19|hash");
  });

  it("exactamente 20 filas no deja cursor y sin datos devuelve una lista vacía", async () => {
    const twenty = fakeSupabase({
      "rpc:search_users": { data: Array.from({ length: 20 }, (_, n) => row(n)), error: null },
    });
    const full = await searchUsers(twenty.supabase, "user");
    expect(full.ok && full.data.nextCursor).toBeNull();
    const empty = fakeSupabase({ "rpc:search_users": { data: null, error: null } });
    expect(await searchUsers(empty.supabase, "zzz")).toEqual({
      ok: true,
      data: { users: [], nextCursor: null },
    });
  });

  it.each(["INVALID_QUERY", "INVALID_CURSOR"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:search_users": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await searchUsers(supabase, "a")).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:search_users": networkThrow });
    expect(await searchUsers(supabase, "ana")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

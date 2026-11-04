import { describe, expect, it } from "vitest";
import { countUnreadNotifications, listNotifications, markNotificationsSeen } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const row = (n: number, kind = "new_follower") => ({
  kind,
  occurred_at: `2026-11-04T10:${String(59 - n).padStart(2, "0")}:00Z`,
  is_unread: n < 3,
  actor_username: `user_${n}`,
  actor_display_name: n % 2 ? `Nombre ${n}` : null,
  actor_avatar_icon: n === 0 ? "sol" : null,
  poll_id: null,
  poll_question: null,
  comment_id: null,
  detail: null,
  cursor: `c${n}`,
});

describe("listNotifications (NOTIF-001)", () => {
  it("traduce las filas sin ids internos y llama con el cursor", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_notifications": { data: [row(0), row(1, "follow_request")], error: null },
    });
    const result = await listNotifications(supabase, "abc");
    expect(queries[0].calls[0]).toEqual(["rpc", "list_notifications", { p_cursor: "abc" }]);
    expect(result).toEqual({
      ok: true,
      data: {
        items: [
          {
            kind: "new_follower",
            occurredAt: "2026-11-04T10:59:00Z",
            isUnread: true,
            actor: { username: "user_0", displayName: null, avatarIcon: "sol" },
          },
          {
            kind: "follow_request",
            occurredAt: "2026-11-04T10:58:00Z",
            isUnread: true,
            actor: { username: "user_1", displayName: "Nombre 1", avatarIcon: null },
          },
        ],
        nextCursor: null,
      },
    });
  });

  it("sin cursor envía null y pagina de 20 con el cursor de la fila 20", async () => {
    const rows = Array.from({ length: 21 }, (_, n) => row(n));
    const { supabase, queries } = fakeSupabase({
      "rpc:list_notifications": { data: rows, error: null },
    });
    const result = await listNotifications(supabase);
    expect(queries[0].calls[0]).toEqual(["rpc", "list_notifications", { p_cursor: null }]);
    expect(result.ok && result.data.items).toHaveLength(20);
    expect(result.ok && result.data.nextCursor).toBe("c19");
  });

  it("exactamente 20 filas no deja cursor", async () => {
    const { supabase } = fakeSupabase({
      "rpc:list_notifications": {
        data: Array.from({ length: 20 }, (_, n) => row(n)),
        error: null,
      },
    });
    const result = await listNotifications(supabase);
    expect(result.ok && result.data.nextCursor).toBeNull();
  });

  it("descarta tipos desconocidos y no repite user_id", async () => {
    const { supabase } = fakeSupabase({
      "rpc:list_notifications": { data: [row(0, "otro_tipo"), row(1)], error: null },
    });
    const result = await listNotifications(supabase);
    expect(result.ok && result.data.items.map((i) => i.actor.username)).toEqual(["user_1"]);
    expect(JSON.stringify(result)).not.toContain("user_id");
  });

  it.each(["AUTH_REQUIRED", "PROFILE_REQUIRED", "INVALID_CURSOR"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:list_notifications": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await listNotifications(supabase)).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:list_notifications": networkThrow });
    expect(await listNotifications(supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("countUnreadNotifications / markNotificationsSeen (NOTIF-001)", () => {
  it("devuelve el contador como número", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:count_unread_notifications": { data: 7, error: null },
    });
    expect(await countUnreadNotifications(supabase)).toEqual({ ok: true, data: 7 });
    expect(queries[0].calls[0].slice(0, 2)).toEqual(["rpc", "count_unread_notifications"]);
  });

  it("sin datos cuenta 0 y propaga errores", async () => {
    const empty = fakeSupabase({ "rpc:count_unread_notifications": { data: null, error: null } });
    expect(await countUnreadNotifications(empty.supabase)).toEqual({ ok: true, data: 0 });
    const failing = fakeSupabase({
      "rpc:count_unread_notifications": {
        data: null,
        error: { code: "P0001", message: "AUTH_REQUIRED" },
      },
    });
    expect(await countUnreadNotifications(failing.supabase)).toEqual({
      ok: false,
      error: "AUTH_REQUIRED",
    });
  });

  it("markNotificationsSeen llama a la RPC y traduce errores y red", async () => {
    const ok = fakeSupabase({ "rpc:mark_notifications_seen": { data: null, error: null } });
    expect(await markNotificationsSeen(ok.supabase)).toEqual({ ok: true, data: undefined });
    expect(ok.queries[0].calls[0].slice(0, 2)).toEqual(["rpc", "mark_notifications_seen"]);
    const bad = fakeSupabase({
      "rpc:mark_notifications_seen": {
        data: null,
        error: { code: "P0001", message: "PROFILE_REQUIRED" },
      },
    });
    expect(await markNotificationsSeen(bad.supabase)).toEqual({
      ok: false,
      error: "PROFILE_REQUIRED",
    });
    const net = fakeSupabase({ "rpc:mark_notifications_seen": networkThrow });
    expect(await markNotificationsSeen(net.supabase)).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });
});

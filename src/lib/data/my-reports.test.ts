import { describe, expect, it } from "vitest";
import { listMyReports } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const row = (n: number, extra: object = {}) => ({
  report_type: "poll",
  target_label: `¿Pregunta ${n}?`,
  target_path: `/polls/00000000-0000-4000-8000-00000000000${n % 10}`,
  reason: "spam",
  created_at: `2026-11-04T10:${String(59 - n).padStart(2, "0")}:00Z`,
  status: "pending",
  reviewed_at: null,
  cursor: `2026-11-04T10:${String(59 - n).padStart(2, "0")}:00.000000Z|poll|id${n}`,
  ...extra,
});

describe("listMyReports (MOD-003)", () => {
  it("traduce las filas y llama con el cursor", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_my_reports": {
        data: [
          row(1, {
            report_type: "comment",
            status: "actioned",
            reviewed_at: "2026-11-04T11:00:00Z",
          }),
          row(2, {
            report_type: "user",
            target_label: null,
            target_path: null,
            status: "dismissed",
            reviewed_at: "2026-11-04T11:00:00Z",
          }),
        ],
        error: null,
      },
    });
    const result = await listMyReports(supabase, "abc");
    expect(queries[0].calls[0]).toEqual(["rpc", "list_my_reports", { p_cursor: "abc" }]);
    expect(result).toEqual({
      ok: true,
      data: {
        items: [
          {
            type: "comment",
            targetLabel: "¿Pregunta 1?",
            targetPath: "/polls/00000000-0000-4000-8000-000000000001",
            reason: "spam",
            createdAt: "2026-11-04T10:58:00Z",
            status: "actioned",
            reviewedAt: "2026-11-04T11:00:00Z",
          },
          {
            type: "user",
            targetLabel: null,
            targetPath: null,
            reason: "spam",
            createdAt: "2026-11-04T10:57:00Z",
            status: "dismissed",
            reviewedAt: "2026-11-04T11:00:00Z",
          },
        ],
        nextCursor: null,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/user_id|reporter|details|detalle/);
  });

  it("sin cursor envía null; con 21 filas devuelve 20 y el cursor de la 20ª", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_my_reports": { data: Array.from({ length: 21 }, (_, n) => row(n)), error: null },
    });
    const result = await listMyReports(supabase);
    expect(queries[0].calls[0]).toEqual(["rpc", "list_my_reports", { p_cursor: null }]);
    expect(result.ok && result.data.items).toHaveLength(20);
    expect(result.ok && result.data.nextCursor).toBe(row(19).cursor);
  });

  it("exactamente 20 filas no deja cursor y sin datos devuelve la lista vacía", async () => {
    const twenty = fakeSupabase({
      "rpc:list_my_reports": { data: Array.from({ length: 20 }, (_, n) => row(n)), error: null },
    });
    const full = await listMyReports(twenty.supabase);
    expect(full.ok && full.data.nextCursor).toBeNull();
    const none = fakeSupabase({ "rpc:list_my_reports": { data: null, error: null } });
    expect(await listMyReports(none.supabase)).toEqual({
      ok: true,
      data: { items: [], nextCursor: null },
    });
  });

  it("descarta tipos o estados desconocidos", async () => {
    const { supabase } = fakeSupabase({
      "rpc:list_my_reports": {
        data: [row(1, { report_type: "otro" }), row(2, { status: "inventado" }), row(3)],
        error: null,
      },
    });
    const result = await listMyReports(supabase);
    expect(result.ok && result.data.items.map((i) => i.targetLabel)).toEqual(["¿Pregunta 3?"]);
  });

  it.each(["AUTH_REQUIRED", "INVALID_CURSOR"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:list_my_reports": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await listMyReports(supabase)).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:list_my_reports": networkThrow });
    expect(await listMyReports(supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

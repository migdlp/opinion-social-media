// MOD-003: estado de las denuncias propias por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra
// que cada cuenta sólo ve sus denuncias, que anon no ejecuta la RPC, que ningún cliente lee ni escribe
// las tablas de denuncias ni su estado, que no se filtra user_id ni el detalle, que el estado que pone
// el operador se refleja y que el objetivo deja de mostrarse si deja de ser visible. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-reportstatus-test-only";

type Account = { id: string; token: string; username: string };
async function account(label: string): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@reportstatus.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `rs${id.replaceAll("-", "").slice(0, 14)}`;
  const inserted = await admin.from("profiles").insert({ user_id: id, username });
  if (inserted.error) throw inserted.error;
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (session.error) throw session.error;
  return { id, username, token: session.data.session!.access_token };
}

async function rpc(fn: string, body: object, token?: string) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text, data: text ? JSON.parse(text) : null };
}

async function rest(method: string, path: string, token?: string, body?: object) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, text: await res.text() };
}

type Row = {
  report_type: string;
  target_label: string | null;
  target_path: string | null;
  reason: string;
  status: string;
  reviewed_at: string | null;
  cursor: string;
};
const mine = async (a: Account, cursor?: string) => {
  const r = await rpc("list_my_reports", { p_cursor: cursor ?? null }, a.token);
  expect(r.status).toBe(200);
  return r.data as Row[];
};

let reporter: Account, other: Account, author: Account, reported: Account;
let pollId: string, commentId: string;

beforeAll(async () => {
  [reporter, other, author, reported] = await Promise.all([
    account("denuncia"),
    account("otra"),
    account("autora"),
    account("denunciada"),
  ]);
  const poll = await admin
    .from("polls")
    .insert({
      user_id: author.id,
      question: "¿Pregunta denunciada por HTTP?",
      comments_enabled: true,
    })
    .select("id")
    .single();
  if (poll.error) throw poll.error;
  pollId = poll.data.id as string;
  const options = await admin.from("poll_options").insert([
    { poll_id: pollId, text: "Sí", position: 1 },
    { poll_id: pollId, text: "No", position: 2 },
  ]);
  if (options.error) throw options.error;
  const comment = await admin
    .from("comments")
    .insert({ poll_id: pollId, user_id: author.id, body: "Comentario denunciado por HTTP" })
    .select("id")
    .single();
  if (comment.error) throw comment.error;
  commentId = comment.data.id as string;
  const reports = await Promise.all([
    admin.from("poll_reports").insert({
      poll_id: pollId,
      reporter_id: reporter.id,
      reason: "spam",
      details: "DETALLE_PRIVADO_HTTP",
    }),
    admin
      .from("user_reports")
      .insert({ reporter_id: reporter.id, reported_id: reported.id, reason: "acoso" }),
    admin.from("poll_reports").insert({ poll_id: pollId, reporter_id: other.id, reason: "odio" }),
  ]);
  for (const r of reports) if (r.error) throw r.error;
  // El debate de una encuesta abierta exige haber votado: la denunciante vota para poder ver el comentario.
  const opt = await admin
    .from("poll_options")
    .select("id")
    .eq("poll_id", pollId)
    .eq("position", 1)
    .single();
  if (opt.error) throw opt.error;
  const vote = await admin
    .from("votes")
    .insert({ poll_id: pollId, option_id: opt.data.id, user_id: reporter.id });
  if (vote.error) throw vote.error;
  const cr = await admin
    .from("comment_reports")
    .insert({ comment_id: commentId, reporter_id: reporter.id, reason: "otro" });
  if (cr.error) throw cr.error;
}, 90_000);

describe("la RPC exige sesión y no filtra datos", () => {
  it("anon no puede ejecutar list_my_reports", async () => {
    const r = await rpc("list_my_reports", {});
    expect([401, 403]).toContain(r.status);
  });

  it("argumentos manipulados (otro reporter_id) no se aceptan: 404", async () => {
    const r = await rpc("list_my_reports", { p_reporter_id: other.id }, reporter.token);
    expect(r.status).toBe(404);
  });

  it("cada cuenta sólo ve las suyas, sin user_id ni detalle, y la persona denunciada no ve nada", async () => {
    const r = await rpc("list_my_reports", {}, reporter.token);
    expect(r.status).toBe(200);
    const rows = r.data as Row[];
    expect(rows.map((x) => x.report_type).sort()).toEqual(["comment", "poll", "user"]);
    expect(r.text).not.toMatch(/user_id|reporter|DETALLE_PRIVADO_HTTP|details/);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        [
          "created_at",
          "cursor",
          "reason",
          "report_type",
          "reviewed_at",
          "status",
          "target_label",
          "target_path",
        ].sort(),
      );
      expect(row.status).toBe("pending");
      expect(row.reviewed_at).toBeNull();
    }
    const poll = rows.find((x) => x.report_type === "poll")!;
    expect(poll.target_label).toBe("¿Pregunta denunciada por HTTP?");
    expect(poll.target_path).toBe(`/polls/${pollId}`);
    const user = rows.find((x) => x.report_type === "user")!;
    expect(user.target_label).toBe(`@${reported.username}`);
    expect(user.target_path).toBe(`/u/${reported.username}`);
    const comment = rows.find((x) => x.report_type === "comment")!;
    expect(comment.target_path).toBe(`/polls/${pollId}#comentario-${commentId}`);

    const others = await mine(other);
    expect(others).toHaveLength(1);
    expect(others[0].reason).toBe("odio");
    expect(await mine(reported)).toEqual([]);
    expect(await mine(author)).toEqual([]);
  });
});

describe("las tablas y el estado no son de los clientes", () => {
  it("ni anon ni authenticated leen, insertan, modifican o borran denuncias ni su estado", async () => {
    for (const token of [undefined, reporter.token, author.token]) {
      for (const table of ["poll_reports", "user_reports", "comment_reports"]) {
        for (const method of ["GET", "DELETE"]) {
          const r = await rest(method, table, token);
          expect(r.status).toBeGreaterThanOrEqual(400);
          expect(r.status).toBeLessThan(500);
        }
        const patch = await rest("PATCH", table, token, {
          status: "actioned",
          reviewed_at: new Date().toISOString(),
        });
        expect(patch.status).toBeGreaterThanOrEqual(400);
        expect(patch.status).toBeLessThan(500);
        const post = await rest("POST", table, token, { status: "actioned" });
        expect(post.status).toBeGreaterThanOrEqual(400);
        expect(post.status).toBeLessThan(500);
      }
    }
    const check = await admin.from("poll_reports").select("status").eq("poll_id", pollId);
    expect(check.data?.every((r) => r.status === "pending")).toBe(true);
  });
});

describe("estado y visibilidad del objetivo", () => {
  it("el cambio del operador se refleja y una restricción impide actioned sin reviewed_at", async () => {
    const bad = await admin
      .from("poll_reports")
      .update({ status: "actioned" })
      .eq("poll_id", pollId)
      .eq("reporter_id", reporter.id);
    expect(bad.error?.code).toBe("23514");
    const ok = await admin
      .from("poll_reports")
      .update({ status: "actioned", reviewed_at: new Date().toISOString() })
      .eq("poll_id", pollId)
      .eq("reporter_id", reporter.id);
    expect(ok.error).toBeNull();
    const row = (await mine(reporter)).find((x) => x.report_type === "poll")!;
    expect(row.status).toBe("actioned");
    expect(row.reviewed_at).not.toBeNull();
    const user = (await mine(reporter)).find((x) => x.report_type === "user")!;
    expect(user.status).toBe("pending");
    expect((await mine(other))[0].status).toBe("pending");
  });

  it("si la encuesta se oculta, la etiqueta y el enlace desaparecen; si se borra, la denuncia también", async () => {
    const hide = await admin.from("polls").update({ status: "hidden" }).eq("id", pollId);
    expect(hide.error).toBeNull();
    const rows = await mine(reporter);
    const poll = rows.find((x) => x.report_type === "poll")!;
    expect(poll.target_label).toBeNull();
    expect(poll.target_path).toBeNull();
    expect(rows.find((x) => x.report_type === "comment")!.target_label).toBeNull();
    const del = await admin.from("polls").delete().eq("id", pollId);
    expect(del.error).toBeNull();
    const after = await mine(reporter);
    expect(after.map((x) => x.report_type)).toEqual(["user"]);
  });

  it("un cursor manipulado da INVALID_CURSOR", async () => {
    for (const bad of [
      "basura",
      "2026-01-01T00:00:00Z|raro|x",
      "2026-01-01T00:00:00Z|poll|no-uuid",
    ]) {
      const r = await rpc("list_my_reports", { p_cursor: bad }, reporter.token);
      expect(r.status).toBe(400);
      expect(r.data.message).toBe("INVALID_CURSOR");
    }
  });
});

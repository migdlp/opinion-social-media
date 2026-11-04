// POLL-004: borrado de encuestas propias por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra que
// sólo la autora borra su encuesta publicada, que ni anon ni otra cuenta ni la autora con la encuesta
// oculta pueden borrar nada, que un DELETE directo sobre polls y sobre las tablas dependientes está
// denegado y que tras el borrado no queda ninguna fila relacionada. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-deletepoll-test-only";

type Account = { id: string; token: string; username: string };
async function account(label: string): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@deletepoll.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `dp${id.replaceAll("-", "").slice(0, 14)}`;
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

async function rest(method: string, path: string, token?: string) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { status: res.status, text: await res.text() };
}

async function newPoll(owner: Account, question: string, status = "published") {
  const created = await admin
    .from("polls")
    .insert({ user_id: owner.id, question, status })
    .select("id")
    .single();
  if (created.error) throw created.error;
  const id = created.data.id as string;
  const options = await admin
    .from("poll_options")
    .insert([
      { poll_id: id, text: "Sí", position: 1 },
      { poll_id: id, text: "No", position: 2 },
    ])
    .select("id, position");
  if (options.error) throw options.error;
  return { id, option: options.data.find((o) => o.position === 1)!.id as string };
}

const count = async (table: string, column: string, id: string) => {
  const r = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, id);
  if (r.error) throw r.error;
  return r.count ?? 0;
};

let author: Account, stranger: Account, voter: Account;
let target: { id: string; option: string }, theirs: { id: string; option: string };
let hiddenPoll: { id: string; option: string };
let commentId: string;

beforeAll(async () => {
  [author, stranger, voter] = await Promise.all([
    account("autora"),
    account("ajena"),
    account("votante"),
  ]);
  target = await newPoll(author, "¿Encuesta que la autora borrará?");
  theirs = await newPoll(stranger, "¿Encuesta de otra cuenta?");
  hiddenPoll = await newPoll(author, "¿Encuesta oculta por moderación?", "hidden");
  const vote = await admin
    .from("votes")
    .insert({ poll_id: target.id, option_id: target.option, user_id: voter.id });
  if (vote.error) throw vote.error;
  const comment = await admin
    .from("comments")
    .insert({ poll_id: target.id, user_id: voter.id, body: "Comentario de prueba" })
    .select("id")
    .single();
  if (comment.error) throw comment.error;
  commentId = comment.data.id as string;
  const extras = await Promise.all([
    admin.from("saved_polls").insert({ user_id: voter.id, poll_id: target.id }),
    admin.from("dismissed_polls").insert({ user_id: voter.id, poll_id: target.id }),
    admin
      .from("poll_reports")
      .insert({ poll_id: target.id, reporter_id: voter.id, reason: "spam" }),
    admin
      .from("comment_reports")
      .insert({ comment_id: commentId, reporter_id: stranger.id, reason: "spam" }),
  ]);
  for (const e of extras) if (e.error) throw e.error;
}, 90_000);

describe("sin permiso no se borra nada", () => {
  it("anon no puede ejecutar delete_my_poll", async () => {
    const r = await rpc("delete_my_poll", { p_poll_id: target.id });
    expect([401, 403]).toContain(r.status);
  });

  it("otra cuenta recibe POLL_UNAVAILABLE y la encuesta sigue", async () => {
    const r = await rpc("delete_my_poll", { p_poll_id: target.id }, stranger.token);
    expect(r.status).toBe(400);
    expect(r.data.message).toBe("POLL_UNAVAILABLE");
    expect(await count("polls", "id", target.id)).toBe(1);
  });

  it("la autora no puede borrar una encuesta oculta por moderación", async () => {
    const r = await rpc("delete_my_poll", { p_poll_id: hiddenPoll.id }, author.token);
    expect(r.status).toBe(400);
    expect(r.data.message).toBe("POLL_UNAVAILABLE");
    expect(await count("polls", "id", hiddenPoll.id)).toBe(1);
  });

  it("una encuesta inexistente o un id manipulado no se distinguen y no dan error del servidor", async () => {
    const missing = await rpc(
      "delete_my_poll",
      { p_poll_id: "99999999-9999-9999-9999-999999999999" },
      author.token,
    );
    expect(missing.status).toBe(400);
    expect(missing.data.message).toBe("POLL_UNAVAILABLE");
    const junk = await rpc("delete_my_poll", { p_poll_id: "no-es-un-uuid" }, author.token);
    expect(junk.status).toBeGreaterThanOrEqual(400);
    expect(junk.status).toBeLessThan(500);
    const nul = await rpc("delete_my_poll", { p_poll_id: null }, author.token);
    expect(nul.data?.message).toBe("POLL_UNAVAILABLE");
  });

  it("un argumento de más (otro user_id) no suplanta a nadie: 404", async () => {
    const r = await rpc(
      "delete_my_poll",
      { p_poll_id: theirs.id, p_user_id: stranger.id },
      author.token,
    );
    expect(r.status).toBe(404);
    expect(await count("polls", "id", theirs.id)).toBe(1);
  });

  it("DELETE directo sobre polls y sobre las tablas dependientes está denegado", async () => {
    for (const token of [undefined, author.token, stranger.token]) {
      for (const table of ["polls", "poll_options", "votes", "comments", "saved_polls"]) {
        const r = await rest("DELETE", `${table}?id=eq.${target.id}`, token);
        expect(r.status).toBeGreaterThanOrEqual(400);
        expect(r.status).toBeLessThan(500);
      }
    }
    const gone = await rest("DELETE", `polls?user_id=eq.${author.id}`, author.token);
    expect(gone.status).toBeGreaterThanOrEqual(400);
    expect(await count("polls", "id", target.id)).toBe(1);
    expect(await count("polls", "id", hiddenPoll.id)).toBe(1);
    expect(await count("polls", "id", theirs.id)).toBe(1);
  });
});

describe("la autora borra su encuesta publicada", () => {
  it("desaparece con todo lo relacionado y no toca otras encuestas", async () => {
    const r = await rpc("delete_my_poll", { p_poll_id: target.id }, author.token);
    expect(r.status).toBe(204);
    expect(await count("polls", "id", target.id)).toBe(0);
    expect(await count("poll_options", "poll_id", target.id)).toBe(0);
    expect(await count("votes", "poll_id", target.id)).toBe(0);
    expect(await count("comments", "poll_id", target.id)).toBe(0);
    expect(await count("comment_reports", "comment_id", commentId)).toBe(0);
    expect(await count("saved_polls", "poll_id", target.id)).toBe(0);
    expect(await count("dismissed_polls", "poll_id", target.id)).toBe(0);
    expect(await count("poll_reports", "poll_id", target.id)).toBe(0);
    expect(await count("polls", "id", theirs.id)).toBe(1);
    expect(await count("poll_options", "poll_id", theirs.id)).toBe(2);
    expect(await count("polls", "id", hiddenPoll.id)).toBe(1);
  });

  it("repetir el borrado da POLL_UNAVAILABLE y votar la borrada también", async () => {
    const again = await rpc("delete_my_poll", { p_poll_id: target.id }, author.token);
    expect(again.status).toBe(400);
    expect(again.data.message).toBe("POLL_UNAVAILABLE");
    const vote = await rpc(
      "vote_poll",
      { p_poll_id: target.id, p_option_id: target.option },
      stranger.token,
    );
    expect(vote.status).toBe(400);
    expect(vote.data.message).toBe("POLL_UNAVAILABLE");
  });
});

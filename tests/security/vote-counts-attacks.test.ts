// RESULTS-005 (D-044): get_poll_vote_counts y vote_count de get_poll_cards por HTTP real contra
// Supabase LOCAL. Demuestra que antes de votar sólo sale el TOTAL (nunca reparto), que ocultas,
// privadas y bloqueos se omiten sin distinguirse de una id inexistente, que se recorta a 20 ids y
// que get_poll_results sigue cerrado (NOT_VOTED) también para la autora. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-counts-test-only";

type Account = { id: string; token: string };
async function account(label: string, isPrivate = false): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@counts.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const inserted = await admin.from("profiles").insert({
    user_id: id,
    username: `vc${id.replaceAll("-", "").slice(0, 14)}`,
    is_private: isPrivate,
  });
  if (inserted.error) throw inserted.error;
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (session.error) throw session.error;
  return { id, token: session.data.session!.access_token };
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
const counts = (ids: unknown, token?: string) =>
  rpc("get_poll_vote_counts", { p_poll_ids: ids }, token);

async function newPoll(user: Account, question: string, extra: Record<string, unknown> = {}) {
  const created = await admin
    .from("polls")
    .insert({ user_id: user.id, question, ...extra })
    .select("id")
    .single();
  if (created.error) throw created.error;
  const options = await admin
    .from("poll_options")
    .insert([
      { poll_id: created.data.id, text: "Sí", position: 1 },
      { poll_id: created.data.id, text: "No", position: 2 },
    ])
    .select("id, position")
    .order("position");
  if (options.error) throw options.error;
  return { id: created.data.id as string, options: options.data.map((o) => o.id as string) };
}

let author: Account, v1: Account, v2: Account, v3: Account, stranger: Account, priv: Account;
let blocked: Account;
let open: Awaited<ReturnType<typeof newPoll>>;
let empty: Awaited<ReturnType<typeof newPoll>>;
let hidden: Awaited<ReturnType<typeof newPoll>>;
let secret: Awaited<ReturnType<typeof newPoll>>;

beforeAll(async () => {
  [author, v1, v2, v3, stranger, priv, blocked] = await Promise.all([
    account("autora"),
    account("v1"),
    account("v2"),
    account("v3"),
    account("extrana"),
    account("privada", true),
    account("bloqueada"),
  ]);
  open = await newPoll(author, "¿Abierta con tres votos?");
  empty = await newPoll(author, "¿Abierta sin votos?");
  hidden = await newPoll(author, "¿Oculta por moderación?", { status: "hidden" });
  secret = await newPoll(priv, "¿De una cuenta privada?");
  const votes = await admin.from("votes").insert([
    { poll_id: open.id, option_id: open.options[0], user_id: v1.id },
    { poll_id: open.id, option_id: open.options[0], user_id: v2.id },
    { poll_id: open.id, option_id: open.options[1], user_id: v3.id },
    { poll_id: hidden.id, option_id: hidden.options[0], user_id: v1.id },
    { poll_id: secret.id, option_id: secret.options[0], user_id: priv.id },
  ]);
  if (votes.error) throw votes.error;
  const block = await admin
    .from("user_blocks")
    .insert({ blocker_id: author.id, blocked_id: blocked.id });
  if (block.error) throw block.error;
}, 90_000);

describe("get_poll_vote_counts por HTTP", () => {
  it("anon, autora y extraña ven el total de una abierta sin votar, y 0 si no hay votos", async () => {
    for (const who of [undefined, author.token, stranger.token]) {
      const r = await counts([open.id, empty.id], who);
      expect(r.status).toBe(200);
      const byId = Object.fromEntries(
        r.data.map((x: { poll_id: string; total_votes: number }) => [x.poll_id, x.total_votes]),
      );
      expect(byId).toEqual({ [open.id]: 3, [empty.id]: 0 });
    }
  });

  it("sólo devuelve poll_id y total_votes: ni reparto, ni porcentajes, ni líder", async () => {
    const r = await counts([open.id], stranger.token);
    expect(Object.keys(r.data[0]).sort()).toEqual(["poll_id", "total_votes"]);
    expect(r.text).not.toMatch(/percentage|option|leader|user_id/);
  });

  it("ocultas, privadas ajenas, bloqueadas e ids inexistentes se omiten igual", async () => {
    const ghost = "00000000-0000-4000-8000-000000000000";
    const r = await counts([hidden.id, secret.id, ghost, open.id], stranger.token);
    expect(r.status).toBe(200);
    expect(r.data.map((x: { poll_id: string }) => x.poll_id)).toEqual([open.id]);
    // Quien está bloqueado por la autora no ve ni el total.
    const b = await counts([open.id], blocked.token);
    expect(b.status).toBe(200);
    expect(b.data).toEqual([]);
  });

  it("recorta a 20 ids: la 21 no se resuelve", async () => {
    const ghosts = Array.from(
      { length: 20 },
      (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    const r = await counts([...ghosts, open.id], stranger.token);
    expect(r.status).toBe(200);
    expect(r.data).toEqual([]);
  });

  it("entradas malformadas dan error de cliente, sin 500", async () => {
    for (const bad of ["no-array", [123], ["no-uuid"]]) {
      const r = await counts(bad, stranger.token);
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    }
    const extra = await rpc("get_poll_vote_counts", { p_poll_ids: [open.id], p_user: "x" });
    expect(extra.status).toBe(404);
  });
});

describe("el total no abre el reparto", () => {
  it("get_poll_results sigue cerrado: AUTH_REQUIRED para anon, NOT_VOTED para autora y extraña", async () => {
    const anon = await rpc("get_poll_results", { p_poll_id: open.id });
    expect(anon.text).toMatch(/AUTH_REQUIRED/);
    for (const who of [author.token, stranger.token]) {
      const r = await rpc("get_poll_results", { p_poll_id: open.id }, who);
      expect(r.status).toBe(400);
      expect(r.text).toContain("NOT_VOTED");
    }
  });

  it("get_poll_cards trae vote_count siempre y results/total_votes nulos sin votar", async () => {
    for (const who of [undefined, author.token, stranger.token]) {
      const r = await rpc("get_poll_cards", { p_poll_ids: [open.id, empty.id] }, who);
      expect(r.status).toBe(200);
      const byId = Object.fromEntries(
        r.data.map((c: { poll_id: string }) => [c.poll_id, c]),
      ) as Record<string, { vote_count: number; total_votes: number | null; results: unknown }>;
      expect(byId[open.id].vote_count).toBe(3);
      expect(byId[empty.id].vote_count).toBe(0);
      for (const c of Object.values(byId)) {
        expect(c.total_votes).toBeNull();
        expect(c.results).toBeNull();
      }
    }
  });

  it("quien votó sigue viendo su reparto y vote_count coincide con total_votes", async () => {
    const r = await rpc("get_poll_cards", { p_poll_ids: [open.id] }, v1.token);
    expect(r.data[0].vote_count).toBe(3);
    expect(r.data[0].total_votes).toBe(3);
    expect(r.data[0].results).toHaveLength(2);
  });
});

// MVP-044: ataques a RLS y canales de filtración por HTTP real (PostgREST, Auth,
// GraphQL) contra la pila Supabase LOCAL. Ejecutar con scripts/check-security-local.sh.
// Nunca contra un proyecto alojado: usa la clave secreta local para preparar datos.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) {
  throw new Error(
    `Sólo contra Supabase local (http://127.0.0.1:<puerto>); recibido: ${URL_ || "(vacío)"}`,
  );
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, SECRET, opts);
const anon = createClient(URL_, PUBLISHABLE, opts);

type Session = { client: SupabaseClient; token: string; id: string };
const PASSWORD = "local-test-password-044";

async function user(email: string): Promise<Session> {
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error && !/already/i.test(created.error.message)) throw created.error;
  // Crear y votar exigen @usuario (V2-002).
  if (created.data.user) {
    const username = `u${created.data.user.id.replaceAll("-", "").slice(0, 12)}`;
    const profile = await admin
      .from("profiles")
      .insert({ user_id: created.data.user.id, username });
    if (profile.error) throw profile.error;
  }
  const client = createClient(URL_, PUBLISHABLE, opts);
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return { client, token: data.session!.access_token, id: data.user!.id };
}

// Petición REST cruda: permite cabeceras (Prefer: count) y verbos que el SDK oculta.
async function rest(path: string, init: RequestInit & { token?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", PUBLISHABLE);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${URL_}${path}`, { ...init, headers });
  const text = await res.text();
  return { status: res.status, text, range: res.headers.get("content-range") };
}

let A: Session; // autor de las encuestas; no vota
let B: Session; // vota en la encuesta abierta
let C: Session; // vota en la que después se oculta
let open_: string;
let hidden: string;
let optionsOpen: string[];

beforeAll(async () => {
  const stamp = Date.now();
  [A, B, C] = await Promise.all([
    user(`a-${stamp}@mvp044.test`),
    user(`b-${stamp}@mvp044.test`),
    user(`c-${stamp}@mvp044.test`),
  ]);
  const p1 = await A.client.rpc("create_poll", {
    p_question: "¿Encuesta abierta 044?",
    p_options: ["Sí", "No"],
  });
  const p2 = await A.client.rpc("create_poll", {
    p_question: "¿Encuesta que se ocultará 044?",
    p_options: ["X", "Y"],
  });
  if (p1.error || p2.error) throw p1.error ?? p2.error;
  open_ = p1.data as string;
  hidden = p2.data as string;
  const { data: opts1 } = await anon
    .from("poll_options")
    .select("id")
    .eq("poll_id", open_)
    .order("position");
  optionsOpen = (opts1 ?? []).map((o) => o.id);
  const { data: opts2 } = await anon
    .from("poll_options")
    .select("id")
    .eq("poll_id", hidden)
    .order("position");
  const v1 = await B.client.rpc("vote_poll", { p_poll_id: open_, p_option_id: optionsOpen[0] });
  const v2 = await C.client.rpc("vote_poll", { p_poll_id: hidden, p_option_id: opts2![0].id });
  if (v1.error || v2.error) throw v1.error ?? v2.error;
  // Operador: oculta la segunda (rol administrativo, como en docs/moderacion.md).
  const h = await admin.from("polls").update({ status: "hidden" }).eq("id", hidden);
  if (h.error) throw h.error;
}, 60_000);

describe("criterio 1: A no obtiene información reservada de B", () => {
  it("votos de B por filtro, embedding o conteo", async () => {
    const byUser = await rest(`/rest/v1/votes?select=*&user_id=eq.${B.id}`, { token: A.token });
    expect(byUser).toMatchObject({ status: 200, text: "[]" });
    const byPoll = await rest(`/rest/v1/votes?select=*&poll_id=eq.${open_}`, { token: A.token });
    expect(byPoll).toMatchObject({ status: 200, text: "[]" });
    const counted = await rest(`/rest/v1/votes?select=id&poll_id=eq.${open_}`, {
      token: A.token,
      headers: { Prefer: "count=exact" },
    });
    expect(counted.range).toBe("*/0");
    const embedded = await rest(
      `/rest/v1/polls?select=id,votes(option_id,user_id)&id=eq.${open_}`,
      { token: A.token },
    );
    expect(embedded.status).toBe(200);
    expect(JSON.parse(embedded.text)).toEqual([{ id: open_, votes: [] }]);
  });

  it("resultados de una encuesta en la que sólo votó B", async () => {
    const r = await A.client.rpc("get_poll_results", { p_poll_id: open_ });
    expect(r.data).toBeNull();
    expect(r.error).toMatchObject({ code: "P0001", message: "NOT_VOTED" });
  });

  it("B sólo ve su propio voto", async () => {
    const own = await rest(`/rest/v1/votes?select=user_id`, { token: B.token });
    expect(JSON.parse(own.text)).toEqual([{ user_id: B.id }]);
  });
});

describe("criterio 2: sin voto no hay totales por ningún canal", () => {
  it("anon: votes, conteos, agregados y embedding denegados", async () => {
    for (const path of [
      "/rest/v1/votes?select=*",
      "/rest/v1/votes?select=count()",
      `/rest/v1/polls?select=id,votes(count)&id=eq.${open_}`,
      `/rest/v1/poll_options?select=id,votes(id)&poll_id=eq.${open_}`,
    ]) {
      const r = await rest(path);
      expect(r.status, path).toBeGreaterThanOrEqual(400);
      expect(r.text, path).not.toMatch(/"(count|total|votes)"\s*:\s*\d/);
    }
    const head = await rest("/rest/v1/votes?select=id", {
      method: "HEAD",
      headers: { Prefer: "count=exact" },
    });
    expect(head.status).toBeGreaterThanOrEqual(400);
    expect(head.range).toBeNull();
  });

  it("autenticado sin voto: agregados deshabilitados y conteo limitado a lo propio", async () => {
    const agg = await rest(`/rest/v1/votes?select=option_id,count()&poll_id=eq.${open_}`, {
      token: A.token,
    });
    expect(agg.status).toBe(400);
    expect(agg.text).toMatch(/PGRST123|aggregate/i);
    const count = await rest(`/rest/v1/votes?select=id`, {
      token: A.token,
      method: "HEAD",
      headers: { Prefer: "count=exact" },
    });
    expect(count.range).toBe("*/0");
  });

  it("RPC de resultados: anon sin sesión en una abierta, sin voto NOT_VOTED, argumentos manipulados rechazados", async () => {
    const asAnon = await rest("/rest/v1/rpc/get_poll_results", {
      method: "POST",
      body: JSON.stringify({ p_poll_id: open_ }),
    });
    // V2-014: anon puede ejecutarla (las cerradas son públicas) pero una abierta pide sesión.
    expect(asAnon.text).toMatch(/AUTH_REQUIRED/);
    expect(asAnon.text).not.toMatch(/total_votes|percentage/);

    const manipulated = await rest("/rest/v1/rpc/get_poll_results", {
      method: "POST",
      token: A.token,
      body: JSON.stringify({ p_poll_id: open_, p_user_id: B.id }),
    });
    expect(manipulated.status).toBe(404); // PGRST202: no existe esa firma
    expect(manipulated.text).not.toMatch(/total_votes|percentage/);

    const viaGet = await rest(`/rest/v1/rpc/get_poll_results?p_poll_id=${open_}`, {
      token: A.token,
    });
    expect(viaGet.text).toMatch(/NOT_VOTED/);
  });

  it("vote_poll no acepta votar por otra persona", async () => {
    const r = await rest("/rest/v1/rpc/vote_poll", {
      method: "POST",
      token: A.token,
      body: JSON.stringify({ p_poll_id: open_, p_option_id: optionsOpen[1], p_user_id: B.id }),
    });
    expect(r.status).toBe(404);
  });

  it("las tablas públicas no exponen autor ni estado", async () => {
    for (const col of ["user_id", "status", "*"]) {
      const r = await rest(`/rest/v1/polls?select=${col}`);
      expect(r.status, col).toBe(401);
    }
    const ok = await rest(
      `/rest/v1/polls?select=id,question,created_at,poll_options(id,text,position)`,
    );
    expect(ok.status).toBe(200);
    expect(ok.text).not.toMatch(/user_id|status|votes|total/);
  });

  it("GraphQL no es un canal alternativo", async () => {
    const r = await rest("/graphql/v1", {
      method: "POST",
      body: JSON.stringify({
        query: "{ votesCollection { totalCount } pollsCollection { edges { node { userId } } } }",
      }),
    });
    expect(r.text).not.toMatch(/totalCount"\s*:\s*\d|userId"\s*:\s*"/);
  });
});

describe("criterio 3: sin escrituras directas, sin cambiar status, ocultas sin filtrarse", () => {
  const writes = (token?: string) => [
    rest("/rest/v1/polls", {
      method: "POST",
      token,
      body: JSON.stringify({ user_id: A.id, question: "¿Directa 044?" }),
    }),
    rest(`/rest/v1/polls?id=eq.${open_}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: "hidden" }),
    }),
    rest(`/rest/v1/polls?id=eq.${hidden}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: "published" }),
    }),
    rest(`/rest/v1/polls?id=eq.${open_}`, { method: "DELETE", token }),
    rest(`/rest/v1/poll_options`, {
      method: "POST",
      token,
      body: JSON.stringify({ poll_id: open_, text: "Z", position: 3 }),
    }),
    rest(`/rest/v1/poll_options?poll_id=eq.${open_}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ text: "Z" }),
    }),
    rest(`/rest/v1/votes`, {
      method: "POST",
      token,
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ poll_id: open_, option_id: optionsOpen[1], user_id: B.id }),
    }),
    rest(`/rest/v1/votes?poll_id=eq.${open_}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ option_id: optionsOpen[1] }),
    }),
    rest(`/rest/v1/votes?poll_id=eq.${open_}`, { method: "DELETE", token }),
  ];

  it.each([
    ["anon", () => undefined],
    ["autor autenticado", () => A.token],
    ["votante autenticado", () => B.token],
  ])("%s: INSERT/UPDATE/DELETE/upsert y cambios de status rechazados", async (_, token) => {
    const results = await Promise.all(writes(token()));
    for (const r of results) expect(r.status, r.text).toBeGreaterThanOrEqual(400);
  });

  it("nada cambió tras los intentos", async () => {
    const { data: polls } = await admin
      .from("polls")
      .select("id, status")
      .in("id", [open_, hidden])
      .order("status");
    expect(polls).toEqual([
      { id: hidden, status: "hidden" },
      { id: open_, status: "published" },
    ]);
    const { count } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", open_);
    expect(count).toBe(1);
    const { data: vote } = await admin
      .from("votes")
      .select("option_id")
      .eq("user_id", B.id)
      .single();
    expect(vote).toEqual({ option_id: optionsOpen[0] });
  });

  it("la encuesta oculta no se filtra por ninguna ruta, ni a su votante ni a su autor", async () => {
    for (const s of [undefined, A.token, C.token]) {
      for (const path of [
        `/rest/v1/polls?select=id,question&id=eq.${hidden}`,
        `/rest/v1/poll_options?select=id,text&poll_id=eq.${hidden}`,
        `/rest/v1/polls?select=id&question=like.*ocultará*`,
      ]) {
        const r = await rest(path, { token: s });
        expect(r.text, `${path} ${s ? "con sesión" : "anon"}`).toBe("[]");
      }
    }
    const ownVote = await rest(`/rest/v1/votes?select=*&poll_id=eq.${hidden}`, { token: C.token });
    expect(ownVote.text).toBe("[]");
    const results = await C.client.rpc("get_poll_results", { p_poll_id: hidden });
    expect(results.error).toMatchObject({ message: "POLL_UNAVAILABLE" });
    const vote = await B.client.rpc("vote_poll", {
      p_poll_id: hidden,
      p_option_id: optionsOpen[0],
    });
    expect(vote.error).toMatchObject({ message: "POLL_UNAVAILABLE" });
    // Misma respuesta para oculta e inexistente: no revela que exista.
    const ghost = await C.client.rpc("get_poll_results", {
      p_poll_id: "00000000-0000-4000-8000-000000000044",
    });
    expect(ghost.error).toMatchObject({ message: "POLL_UNAVAILABLE" });
  });
});

// V2-035: ataques por HTTP real (PostgREST/RPC) al feed nuevo de la fase 2: modos Recientes y
// Siguiendo, categorías, cursores, retención de cerradas y voto desde la tarjeta. Complementa a
// social-attacks.test.ts (V2-024). Ejecutar con scripts/check-security-local.sh. Sólo contra la
// pila Supabase LOCAL: usa la clave secreta local para preparar y comprobar datos.
//
// Cuentas: PUB (pública, autora), PRIV (privada, autora), FOL (seguidora aceptada de PRIV), PEN
// (solicitud pendiente a PRIV), STR (extraña) y anon. Encuestas de PUB y de PRIV abiertas y
// cerradas, una oculta, una caducada para el feed (cerrada hace 25 h) y 22 de «tecnologia» para
// paginar.
import { createClient } from "@supabase/supabase-js";
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
const PASSWORD = "local-test-password-v2-035";

type Account = { id: string; token: string; username: string };

async function account(role: string, isPrivate: boolean): Promise<Account> {
  const email = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@v2035.test`;
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  const username = `${role}${id.replaceAll("-", "").slice(0, 8)}`;
  const profile = await admin
    .from("profiles")
    .insert({ user_id: id, username, is_private: isPrivate });
  if (profile.error) throw profile.error;
  const client = createClient(URL_, PUBLISHABLE, opts);
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return { id, token: data.session!.access_token, username };
}

type Reply = { status: number; text: string; json: unknown };

async function http(path: string, init: RequestInit & { token?: string } = {}): Promise<Reply> {
  const headers = new Headers(init.headers);
  headers.set("apikey", PUBLISHABLE);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${URL_}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // no es JSON: se compara el texto
  }
  return { status: res.status, text, json };
}

const rpc = (name: string, args: object, token?: string) =>
  http(`/rest/v1/rpc/${name}`, { method: "POST", token, body: JSON.stringify(args) });
const rows = (r: Reply) => (Array.isArray(r.json) ? (r.json as Record<string, unknown>[]) : []);
const message = (r: Reply) => (r.json as { message?: string } | null)?.message ?? r.text;
const NO_INTERNALS = /sql|syntax|pg_|duplicate key|constraint|stack|relation "/i;

// Recorre todas las páginas del feed con la identidad dada y devuelve los ids en orden.
async function feed(mode: string, token?: string, category?: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 40; page++) {
    const r = await rpc(
      "get_feed",
      {
        p_mode: mode,
        ...(category ? { p_category: category } : {}),
        ...(cursor ? { p_cursor: cursor } : {}),
      },
      token,
    );
    expect(r.status, r.text).toBe(200);
    const batch = rows(r);
    for (const row of batch.slice(0, 20)) ids.push(row.poll_id as string);
    if (batch.length <= 20) return ids;
    cursor = batch[19].cursor as string;
  }
  throw new Error("el feed no termina");
}

let PUB: Account;
let PRIV: Account;
let FOL: Account;
let PEN: Account;
let STR: Account;
let pubOpen: string;
let pubClosed: string;
let pubExpired: string;
let privOpen: string;
let privClosed: string;
let hidden: string;
const masa: string[] = [];
const option: Record<string, string[]> = {};

// Datos de partida por inserción administrativa: create_poll limita a 5 encuestas por hora y autor.
// closedHoursAgo: cerrada hace tantas horas (se crea antes para cumplir closes_at > created_at).
async function seedPoll(
  author: Account,
  question: string,
  options: { category: string; closedHoursAgo?: number; hidden?: boolean },
) {
  const now = Date.now();
  const closes =
    options.closedHoursAgo === undefined
      ? null
      : new Date(now - options.closedHoursAgo * 3_600_000);
  const created = closes === null ? new Date(now) : new Date(closes.getTime() - 48 * 3_600_000);
  const inserted = await admin
    .from("polls")
    .insert({
      user_id: author.id,
      question,
      category_slug: options.category,
      status: options.hidden ? "hidden" : "published",
      created_at: created.toISOString(),
      closes_at: closes?.toISOString() ?? null,
    })
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;
  const id = inserted.data.id as string;
  const opts = await admin
    .from("poll_options")
    .insert([
      { poll_id: id, text: "Rojo", position: 1 },
      { poll_id: id, text: "Azul", position: 2 },
    ])
    .select("id, position");
  if (opts.error) throw opts.error;
  option[id] = (opts.data ?? []).sort((x, y) => x.position - y.position).map((o) => o.id);
  return id;
}

async function vote(who: Account, poll: string, index: number) {
  const r = await rpc(
    "vote_poll",
    { p_poll_id: poll, p_option_id: option[poll][index] },
    who.token,
  );
  if (r.status >= 400) throw new Error(`vote_poll: ${r.text}`);
}

beforeAll(async () => {
  [PUB, PRIV, FOL, PEN, STR] = await Promise.all([
    account("pub", false),
    account("priv", true),
    account("fol", false),
    account("pen", false),
    account("str", false),
  ]);
  const f = await admin.from("follows").insert([
    { follower_id: FOL.id, followee_id: PRIV.id, status: "accepted" },
    { follower_id: PEN.id, followee_id: PRIV.id, status: "pending" },
  ]);
  if (f.error) throw f.error;

  // Se siembran abiertas y se vota ANTES de cerrar: las cerradas ya no admiten votos.
  pubOpen = await seedPoll(PUB, "¿Pública abierta del feed V2-035?", { category: "deportes" });
  pubClosed = await seedPoll(PUB, "¿Pública cerrada del feed V2-035?", { category: "deportes" });
  pubExpired = await seedPoll(PUB, "¿Pública caducada del feed V2-035?", { category: "deportes" });
  privOpen = await seedPoll(PRIV, "¿Privada abierta del feed V2-035?", { category: "deportes" });
  privClosed = await seedPoll(PRIV, "¿Privada cerrada del feed V2-035?", { category: "deportes" });
  hidden = await seedPoll(PUB, "¿Oculta del feed V2-035?", { category: "deportes", hidden: true });
  for (let i = 0; i < 22; i++)
    masa.push(await seedPoll(PUB, `¿Masa de tecnología ${i} V2-035?`, { category: "tecnologia" }));

  await vote(STR, pubClosed, 0);
  await vote(STR, pubExpired, 1);
  await vote(FOL, privClosed, 1);
  // Cierres: hace 1 h (sigue en el feed, < 24 h) y hace 25 h (sale del feed).
  for (const [poll, hoursAgo] of [
    [pubClosed, 1],
    [pubExpired, 25],
    [privClosed, 1],
  ] as [string, number][]) {
    const created = new Date(Date.now() - (hoursAgo + 48) * 3_600_000).toISOString();
    const closes = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
    const r = await admin
      .from("polls")
      .update({ created_at: created, closes_at: closes })
      .eq("id", poll);
    if (r.error) throw r.error;
  }
}, 120_000);

const viewers = (): [string, string | undefined][] => [
  ["anon", undefined],
  ["extraño", STR.token],
  ["solicitud pendiente", PEN.token],
];

describe("Recientes: sólo lo visible", () => {
  it.each(["anon", "extraño", "solicitud pendiente"])(
    "%s no recibe privadas ni ocultas por el feed",
    async (name) => {
      const token = viewers().find(([n]) => n === name)![1];
      const ids = await feed("recientes", token);
      expect(ids).toContain(pubOpen);
      expect(ids).toContain(pubClosed);
      for (const hiddenId of [privOpen, privClosed, hidden])
        expect(ids, hiddenId).not.toContain(hiddenId);
    },
  );

  it("la propia cuenta y su seguidora aceptada sí ven las privadas", async () => {
    for (const token of [PRIV.token, FOL.token]) {
      const ids = await feed("recientes", token);
      expect(ids).toContain(privOpen);
      expect(ids).toContain(privClosed);
      expect(ids).not.toContain(hidden);
    }
  });

  it("la retención sólo afecta al feed: la caducada sigue accesible por detalle y resultados", async () => {
    for (const token of [undefined, STR.token]) {
      expect(await feed("recientes", token)).not.toContain(pubExpired);
      const direct = await http(`/rest/v1/polls?select=id&id=eq.${pubExpired}`, { token });
      expect(rows(direct)).toEqual([{ id: pubExpired }]);
      const results = await rpc("get_poll_results", { p_poll_id: pubExpired }, token);
      expect(results.status).toBe(200);
    }
  });

  it("nada de lo recibido contiene user_id, autor ni agregados", async () => {
    const r = await rpc("get_feed", {}, FOL.token);
    expect(r.status).toBe(200);
    for (const row of rows(r))
      expect(Object.keys(row).sort()).toEqual(["created_at", "cursor", "poll_id"]);
    expect(r.text).not.toMatch(/user_id|total_votes|percentage|votes"/);
    for (const id of [PUB.id, PRIV.id, FOL.id, PEN.id, STR.id]) expect(r.text).not.toContain(id);
  });
});

describe("Siguiendo: sólo relaciones aceptadas, sin parámetro de identidad", () => {
  it("anon es rechazado de la misma forma con cualquier argumento y sin datos", async () => {
    const plain = await rpc("get_feed", { p_mode: "siguiendo" });
    expect(message(plain)).toBe("AUTH_REQUIRED");
    for (const args of [
      { p_mode: "siguiendo", p_category: "deportes" },
      {
        p_mode: "siguiendo",
        p_cursor: "2026-01-01T00:00:00.000000Z|00000000-0000-4000-8000-000000000000",
      },
    ]) {
      const r = await rpc("get_feed", args);
      expect(message(r)).toBe("AUTH_REQUIRED");
      expect(r.text).not.toContain(pubOpen);
    }
  });

  it("el extraño y la solicitud pendiente reciben una lista vacía: pendiente no es seguimiento", async () => {
    expect(await feed("siguiendo", STR.token)).toEqual([]);
    expect(await feed("siguiendo", PEN.token)).toEqual([]);
  });

  it("la seguidora aceptada sólo recibe las encuestas de quien sigue", async () => {
    const ids = await feed("siguiendo", FOL.token);
    expect(ids.sort()).toEqual([privOpen, privClosed].sort());
    for (const other of [pubOpen, pubClosed, hidden, ...masa]) expect(ids).not.toContain(other);
  });

  it("no hay forma de indicar otra identidad", async () => {
    for (const extra of [{ p_user_id: FOL.id }, { p_follower: FOL.id }, { p_viewer: FOL.id }]) {
      const r = await rpc("get_feed", { p_mode: "siguiendo", ...extra }, STR.token);
      expect(r.status).toBe(404); // PGRST202: no existe esa firma
      expect(r.text).not.toContain(privOpen);
    }
    // Ni por GET con parámetros añadidos.
    const viaGet = await http(`/rest/v1/rpc/get_feed?p_mode=siguiendo&p_user_id=${FOL.id}`, {
      token: STR.token,
    });
    expect(viaGet.status).toBeGreaterThanOrEqual(400);
    expect(viaGet.text).not.toContain(privOpen);
  });
});

describe("categorías y cursores manipulados", () => {
  it("la categoría concreta devuelve sólo esa categoría y respeta la visibilidad", async () => {
    const strDeportes = await feed("recientes", STR.token, "deportes");
    expect(strDeportes).toContain(pubOpen);
    expect(strDeportes).not.toContain(privOpen);
    for (const id of masa) expect(strDeportes).not.toContain(id);
    const folDeportes = await feed("recientes", FOL.token, "deportes");
    expect(folDeportes).toContain(privOpen);

    const tech = await feed("recientes", undefined, "tecnologia");
    expect(masa.every((id) => tech.includes(id))).toBe(true);
    expect(tech).not.toContain(pubOpen);
  });

  it("paginar 22 encuestas de una categoría no repite ni salta ninguna, y el cursor conserva el filtro", async () => {
    const r = await rpc("get_feed", { p_category: "tecnologia" });
    const first = rows(r);
    expect(first).toHaveLength(21);
    const ids = await feed("recientes", undefined, "tecnologia");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => masa.includes(id))).toHaveLength(22);
    // Un cursor de otra categoría, usado con ésta, no cambia el filtro.
    const cross = await rpc("get_feed", { p_category: "deportes", p_cursor: first[19].cursor });
    for (const row of rows(cross)) expect(masa).not.toContain(row.poll_id);
  });

  it("modo, categoría y cursor inválidos dan errores controlados sin SQL ni datos", async () => {
    const cases: [object, string][] = [
      [{ p_mode: "popular" }, "INVALID_FEED_MODE"],
      [{ p_mode: "'; drop table polls; --" }, "INVALID_FEED_MODE"],
      [{ p_category: "no-existe" }, "INVALID_CATEGORY"],
      [{ p_category: "deportes' or '1'='1" }, "INVALID_CATEGORY"],
      [{ p_cursor: "basura" }, "INVALID_CURSOR"],
      [{ p_cursor: "2026-10-27T10:00:00.000000Z|no-es-un-uuid" }, "INVALID_CURSOR"],
      [{ p_cursor: "x'; select pg_sleep(5); --|y" }, "INVALID_CURSOR"],
    ];
    for (const [args, expected] of cases) {
      const r = await rpc("get_feed", args, STR.token);
      expect(message(r), JSON.stringify(args)).toBe(expected);
      expect(r.text).not.toMatch(NO_INTERNALS);
      expect(r.text).not.toContain(pubOpen);
    }
  });

  it("un cursor forjado apuntando a una encuesta privada no la hace visible", async () => {
    const forged = `2999-01-01T00:00:00.000000Z|${privOpen}`;
    for (const token of [undefined, STR.token, PEN.token]) {
      const r = await rpc("get_feed", { p_cursor: forged }, token);
      expect(r.status).toBe(200);
      for (const row of rows(r)) expect([privOpen, privClosed, hidden]).not.toContain(row.poll_id);
    }
  });
});

describe("resultados de las tarjetas del feed", () => {
  it("get_feed_results con los ids del feed sólo entrega agregados de votadas y cerradas visibles", async () => {
    const all = [pubOpen, pubClosed, privOpen, privClosed, hidden];
    const polls = async (token?: string) => {
      const r = await rpc("get_feed_results", { p_poll_ids: all }, token);
      expect(r.status).toBe(200);
      return [...new Set(rows(r).map((x) => x.poll_id as string))].sort();
    };
    expect(await polls()).toEqual([pubClosed]);
    expect(await polls(PEN.token)).toEqual([pubClosed]);
    expect(await polls(STR.token)).toEqual([pubClosed]);
    expect(await polls(FOL.token)).toEqual([pubClosed, privClosed].sort());
  });

  it("una abierta sin votar no entrega agregados por ninguna vía de la tarjeta", async () => {
    for (const [, token] of viewers()) {
      const direct = await rpc("get_poll_results", { p_poll_id: pubOpen }, token);
      expect(direct.status).toBeGreaterThanOrEqual(400);
      expect(direct.text).not.toMatch(/total_votes|percentage/);
    }
  });
});

describe("voto simultáneo desde dos tarjetas o pestañas", () => {
  it("dos votos a la vez de la misma cuenta dejan un único voto y errores sin SQL", async () => {
    const pollId = await seedPoll(PUB, "¿Voto simultáneo del feed V2-035?", { category: "otros" });
    const calls = await Promise.all([
      rpc("vote_poll", { p_poll_id: pollId, p_option_id: option[pollId][0] }, STR.token),
      rpc("vote_poll", { p_poll_id: pollId, p_option_id: option[pollId][1] }, STR.token),
      rpc("vote_poll", { p_poll_id: pollId, p_option_id: option[pollId][0] }, STR.token),
    ]);
    const succeeded = calls.filter((c) => c.status < 400);
    expect(succeeded.length).toBeGreaterThanOrEqual(1);
    for (const failed of calls.filter((c) => c.status >= 400)) {
      expect(message(failed)).toBe("ALREADY_VOTED");
      expect(failed.text).not.toMatch(NO_INTERNALS);
    }
    const { data, error } = await admin
      .from("votes")
      .select("user_id, option_id")
      .eq("poll_id", pollId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(STR.id);
  });

  it("quien no puede ver una encuesta privada no la vota ni desde la tarjeta, con carreras", async () => {
    const calls = await Promise.all(
      [STR, PEN, STR, PEN].map((who) =>
        rpc("vote_poll", { p_poll_id: privOpen, p_option_id: option[privOpen][0] }, who.token),
      ),
    );
    for (const c of calls) {
      expect(message(c)).toBe("POLL_UNAVAILABLE");
      expect(c.text).not.toMatch(NO_INTERNALS);
    }
    const { count } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", privOpen);
    expect(count).toBe(0);
  });
});

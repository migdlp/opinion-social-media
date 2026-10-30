// V2-024: ataques por HTTP real (PostgREST/RPC) a las vías de la fase 2: cuentas privadas,
// seguidores, votos visibles en un perfil, encuestas cerradas y denuncias. Complementa a
// rls-attacks.test.ts (MVP-044). Ejecutar con scripts/check-security-local.sh. Sólo contra la
// pila Supabase LOCAL: usa la clave secreta local para preparar y comprobar datos.
//
// Cuentas: PUB (pública, autora), PRIV (privada, autora), FOL (seguidora aceptada de PRIV),
// PEN (solicitud pendiente a PRIV), STR (extraña) y anon. Encuestas: una abierta y otra cerrada
// de PUB y de PRIV; STR vota las públicas y FOL las privadas antes de que cierren.
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
const PASSWORD = "local-test-password-v2-024";
const GHOST = "00000000-0000-4000-8000-000000000024";

type Account = { id: string; token: string; username: string };

async function account(role: string, isPrivate: boolean): Promise<Account> {
  const email = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@v2024.test`;
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
    .insert({ user_id: id, username, is_private: isPrivate, vote_visibility: "profile" });
  if (profile.error) throw profile.error;
  const client = createClient(URL_, PUBLISHABLE, opts);
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return { id, token: data.session!.access_token, username };
}

type Reply = { status: number; text: string; json: unknown; range: string | null };

// Petición cruda: permite cabeceras y verbos que el SDK oculta.
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
  return { status: res.status, text, json, range: res.headers.get("content-range") };
}

const rpc = (name: string, args: object, token?: string) =>
  http(`/rest/v1/rpc/${name}`, { method: "POST", token, body: JSON.stringify(args) });
const rows = (r: Reply) => (Array.isArray(r.json) ? (r.json as Record<string, unknown>[]) : []);
const message = (r: Reply) => (r.json as { message?: string } | null)?.message ?? r.text;

let PUB: Account;
let PRIV: Account;
let FOL: Account;
let PEN: Account;
let STR: Account;
let pubOpen: string;
let pubClosed: string;
let privOpen: string;
let privClosed: string;
const option: Record<string, string[]> = {};

async function createPoll(author: Account, question: string, closes?: string) {
  const r = await rpc(
    "create_poll",
    {
      p_question: question,
      p_options: ["Rojo", "Azul"],
      ...(closes ? { p_closes_at: closes } : {}),
    },
    author.token,
  );
  if (r.status !== 200) throw new Error(`create_poll: ${r.text}`);
  const id = r.json as string;
  const { data, error } = await admin
    .from("poll_options")
    .select("id")
    .eq("poll_id", id)
    .order("position");
  if (error) throw error;
  option[id] = (data ?? []).map((o) => o.id);
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

async function close(poll: string) {
  const past = new Date(Date.now() - 3_600_000).toISOString();
  const earlier = new Date(Date.now() - 7_200_000).toISOString();
  const r = await admin
    .from("polls")
    .update({ created_at: earlier, closes_at: past })
    .eq("id", poll);
  if (r.error) throw r.error;
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

  const soon = new Date(Date.now() + 2 * 3_600_000).toISOString();
  pubOpen = await createPoll(PUB, "¿Pública y abierta V2-024?");
  pubClosed = await createPoll(PUB, "¿Pública y cerrada V2-024?", soon);
  privOpen = await createPoll(PRIV, "¿Privada y abierta V2-024?");
  privClosed = await createPoll(PRIV, "¿Privada y cerrada V2-024?", soon);
  await vote(STR, pubOpen, 0);
  await vote(STR, pubClosed, 0);
  await vote(FOL, privOpen, 0);
  await vote(FOL, privClosed, 1);
  await close(pubClosed);
  await close(privClosed);
}, 90_000);

const VIEWER_NAMES = ["anon", "extraño", "solicitud pendiente"];
const INSIDER_NAMES = ["la propia cuenta", "seguidor aceptado"];
// Los tokens existen sólo tras beforeAll: it.each recibe nombres y los resuelve al ejecutar.
const tokenOf = (name: string) =>
  name === "anon"
    ? undefined
    : name === "extraño"
      ? STR.token
      : name === "solicitud pendiente"
        ? PEN.token
        : name === "la propia cuenta"
          ? PRIV.token
          : FOL.token;
const viewers = () => [
  ["anon", undefined],
  ["extraño", STR.token],
  ["solicitud pendiente", PEN.token],
];
const insiders = () => [
  ["la propia cuenta", PRIV.token],
  ["seguidor aceptado", FOL.token],
];

describe("encuestas de una cuenta privada: lectura directa", () => {
  const ids = () => `in.(${privOpen},${privClosed})`;
  it.each(VIEWER_NAMES)("%s no ve encuestas ni opciones privadas por REST", async (name) => {
    const token = tokenOf(name);
    for (const path of [
      `/rest/v1/polls?select=id,question&id=${ids()}`,
      `/rest/v1/poll_options?select=id,text&poll_id=${ids()}`,
      `/rest/v1/polls?select=id&question=like.*Privada*`,
      `/rest/v1/polls?select=id,poll_options(id,text)&id=${ids()}`,
    ]) {
      const r = await http(path, { token });
      expect(r.text, path).toBe("[]");
    }
  });

  it.each(INSIDER_NAMES)("%s sí las ve", async (name) => {
    const token = tokenOf(name);
    const r = await http(`/rest/v1/polls?select=id&id=${ids()}`, { token });
    expect(
      rows(r)
        .map((x) => x.id)
        .sort(),
    ).toEqual([privOpen, privClosed].sort());
  });

  it.each([...VIEWER_NAMES, ...INSIDER_NAMES])("%s ve las encuestas públicas", async (name) => {
    const token = tokenOf(name);
    const r = await http(`/rest/v1/polls?select=id&id=in.(${pubOpen},${pubClosed})`, { token });
    expect(rows(r)).toHaveLength(2);
  });
});

describe("encuestas de una cuenta privada: RPC indistinguibles de una inexistente", () => {
  it.each(VIEWER_NAMES.filter((name) => name !== "anon"))(
    "%s: votar, pedir resultados y denunciar responden igual que ante un id inexistente",
    async (name) => {
      const token = tokenOf(name);
      for (const poll of [privOpen, privClosed]) {
        const attempts: [string, (id: string) => Promise<Reply>][] = [
          [
            "vote_poll",
            (id) => rpc("vote_poll", { p_poll_id: id, p_option_id: option[poll][0] }, token),
          ],
          ["get_poll_results", (id) => rpc("get_poll_results", { p_poll_id: id }, token)],
          ["report_poll", (id) => rpc("report_poll", { p_poll_id: id, p_reason: "spam" }, token)],
        ];
        for (const [name, call] of attempts) {
          const real = await call(poll);
          const ghost = await call(GHOST);
          expect(message(real), `${name} ${poll}`).toBe("POLL_UNAVAILABLE");
          expect(real.text, name).toBe(ghost.text);
          expect(real.text, name).not.toMatch(/total_votes|percentage|votes/);
        }
      }
    },
  );

  it("anon no obtiene resultados de ninguna encuesta privada", async () => {
    for (const poll of [privOpen, privClosed]) {
      const r = await rpc("get_poll_results", { p_poll_id: poll });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.text).not.toMatch(/total_votes|percentage/);
    }
  });

  it("el voto no se puede emitir saltándose vote_poll ni por REST", async () => {
    const r = await http("/rest/v1/votes", {
      method: "POST",
      token: STR.token,
      body: JSON.stringify({ poll_id: privOpen, option_id: option[privOpen][0], user_id: STR.id }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    const { count } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", privOpen);
    expect(count).toBe(1); // sólo el de FOL
  });

  it("un seguidor aceptado que votó sí obtiene sus resultados", async () => {
    const r = await rpc("get_poll_results", { p_poll_id: privOpen }, FOL.token);
    expect(r.status).toBe(200);
    expect(rows(r)[0]).toMatchObject({ total_votes: 1 });
  });
});

describe("encuestas abiertas y cerradas", () => {
  it("una abierta no da agregados a quien no ha votado, aunque sea pública", async () => {
    const anon = await rpc("get_poll_results", { p_poll_id: pubOpen });
    expect(message(anon)).toBe("AUTH_REQUIRED");
    const pen = await rpc("get_poll_results", { p_poll_id: pubOpen }, PEN.token);
    expect(message(pen)).toBe("NOT_VOTED");
    for (const r of [anon, pen]) expect(r.text).not.toMatch(/total_votes|percentage/);
  });

  it("una cerrada pública entrega los resultados a todos (D-020)", async () => {
    for (const [, token] of [...viewers(), ...insiders()]) {
      const r = await rpc("get_poll_results", { p_poll_id: pubClosed }, token);
      expect(r.status).toBe(200);
      expect(rows(r)[0]).toMatchObject({ total_votes: 1 });
    }
  });

  it("una cerrada privada sólo da resultados a quien puede ver a su autor", async () => {
    for (const [, token] of insiders()) {
      const r = await rpc("get_poll_results", { p_poll_id: privClosed }, token);
      expect(r.status).toBe(200);
    }
    for (const [name, token] of viewers().filter(([n]) => n !== "anon")) {
      const r = await rpc("get_poll_results", { p_poll_id: privClosed }, token);
      expect(message(r), name).toBe("POLL_UNAVAILABLE");
    }
  });

  it("no se vota una encuesta cerrada ni por RPC ni insertando el voto", async () => {
    const viaRpc = await rpc(
      "vote_poll",
      { p_poll_id: pubClosed, p_option_id: option[pubClosed][1] },
      PEN.token,
    );
    expect(message(viaRpc)).toBe("POLL_CLOSED");
    const viaRest = await http("/rest/v1/votes", {
      method: "POST",
      token: PEN.token,
      body: JSON.stringify({
        poll_id: pubClosed,
        option_id: option[pubClosed][1],
        user_id: PEN.id,
      }),
    });
    expect(viaRest.status).toBeGreaterThanOrEqual(400);
    const { count } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pubClosed);
    expect(count).toBe(1);
  });

  it("get_feed_results con una lista mezclada sólo devuelve lo autorizado, sin error", async () => {
    const all = [pubOpen, pubClosed, privOpen, privClosed];
    const polls = async (token?: string) => {
      const r = await rpc("get_feed_results", { p_poll_ids: all }, token);
      expect(r.status).toBe(200);
      return [...new Set(rows(r).map((x) => x.poll_id as string))].sort();
    };
    expect(await polls()).toEqual([pubClosed]);
    expect(await polls(PEN.token)).toEqual([pubClosed]);
    expect(await polls(STR.token)).toEqual([pubOpen, pubClosed].sort());
    expect(await polls(FOL.token)).toEqual([pubClosed, privOpen, privClosed].sort());
  });
});

describe("perfiles y enumeración de usuarios", () => {
  it.each([...VIEWER_NAMES, ...INSIDER_NAMES])(
    "%s no lee user_id de profiles ni filtra por él",
    async (name) => {
      const token = tokenOf(name);
      for (const path of [
        "/rest/v1/profiles?select=user_id",
        "/rest/v1/profiles?select=*",
        `/rest/v1/profiles?select=username&user_id=eq.${PRIV.id}`,
        `/rest/v1/profiles?select=username&order=user_id`,
        "/rest/v1/polls?select=id,profiles(username)",
      ]) {
        const r = await http(path, { token });
        expect(r.status, path).toBeGreaterThanOrEqual(400);
        expect(r.text, path).not.toContain(PRIV.id);
      }
    },
  );

  it("las columnas públicas de profiles no contienen identificadores", async () => {
    const r = await http(`/rest/v1/profiles?select=username,display_name,is_private,created_at`);
    expect(r.status).toBe(200);
    for (const id of [PUB.id, PRIV.id, FOL.id, PEN.id, STR.id]) expect(r.text).not.toContain(id);
    expect(rows(r).length).toBeGreaterThanOrEqual(5);
  });

  it("profiles no se escribe directamente", async () => {
    for (const token of [undefined, PUB.token, STR.token]) {
      for (const init of [
        { method: "PATCH", body: JSON.stringify({ is_private: false }) },
        { method: "DELETE" },
      ]) {
        const r = await http(`/rest/v1/profiles?username=eq.${PRIV.username}`, { ...init, token });
        expect(r.status).toBeGreaterThanOrEqual(400);
      }
    }
    const { data } = await admin
      .from("profiles")
      .select("is_private")
      .eq("user_id", PRIV.id)
      .single();
    expect(data).toEqual({ is_private: true });
  });

  it("get_profile de una cuenta privada da la cabecera pero no el contenido ni user_id", async () => {
    for (const [, token] of viewers()) {
      const r = await rpc("get_profile", { p_username: PRIV.username }, token);
      expect(r.status).toBe(200);
      expect(rows(r)[0]).toMatchObject({
        username: PRIV.username,
        is_private: true,
        can_view_content: false,
      });
      expect(Object.keys(rows(r)[0])).not.toContain("user_id");
      for (const id of [PUB.id, PRIV.id, FOL.id, PEN.id, STR.id]) expect(r.text).not.toContain(id);
    }
    for (const [, token] of insiders()) {
      const r = await rpc("get_profile", { p_username: PRIV.username }, token);
      expect(rows(r)[0]).toMatchObject({ can_view_content: true });
    }
  });

  it("get_profile no distingue mayúsculas pero sí rechaza usuarios inexistentes", async () => {
    const upper = await rpc("get_profile", { p_username: PUB.username.toUpperCase() });
    expect(rows(upper)[0]).toMatchObject({ username: PUB.username });
    const none = await rpc("get_profile", { p_username: "no_existe_v2024" });
    expect(message(none)).toBe("USER_NOT_FOUND");
  });

  it("la relación con el visitante sólo la ve el propio visitante", async () => {
    const asPen = await rpc("get_profile", { p_username: PRIV.username }, PEN.token);
    expect(rows(asPen)[0]).toMatchObject({ viewer_relation: "pending" });
    const asFol = await rpc("get_profile", { p_username: PRIV.username }, FOL.token);
    expect(rows(asFol)[0]).toMatchObject({ viewer_relation: "following" });
    const asAnon = await rpc("get_profile", { p_username: PRIV.username });
    expect(rows(asAnon)[0]).toMatchObject({ viewer_relation: "none" });
  });
});

describe("contenido del perfil: encuestas y votos", () => {
  it.each(VIEWER_NAMES)(
    "%s: get_profile_polls y get_profile_votes de una cuenta privada",
    async (name) => {
      const token = tokenOf(name);
      for (const name of ["get_profile_polls", "get_profile_votes"]) {
        const r = await rpc(name, { p_username: PRIV.username }, token);
        expect(message(r), name).toBe("PROFILE_PRIVATE");
        expect(r.text).not.toContain(privOpen);
        expect(r.text).not.toContain(privClosed);
      }
    },
  );

  it.each(INSIDER_NAMES)("%s lee las encuestas del perfil privado", async (name) => {
    const token = tokenOf(name);
    const r = await rpc("get_profile_polls", { p_username: PRIV.username }, token);
    expect(
      rows(r)
        .map((x) => x.poll_id)
        .sort(),
    ).toEqual([privOpen, privClosed].sort());
    expect(Object.keys(rows(r)[0])).not.toContain("user_id");
  });

  it("los votos de una cuenta pública en encuestas privadas no se ven sin acceso a su autora", async () => {
    for (const [, token] of viewers()) {
      const r = await rpc("get_profile_votes", { p_username: FOL.username }, token);
      expect(r.status).toBe(200);
      expect(rows(r)).toEqual([]);
      expect(r.text).not.toContain(privOpen);
    }
  });

  it("P-1: la opción elegida en una abierta sólo se revela a quien la votó; en cerradas es pública", async () => {
    for (const [, token] of [...viewers().filter(([n]) => n !== "extraño"), ...insiders()]) {
      const r = await rpc("get_profile_votes", { p_username: STR.username }, token);
      const byPoll = new Map(rows(r).map((x) => [x.poll_id as string, x]));
      expect(byPoll.get(pubOpen), "abierta").toMatchObject({
        choice_hidden: true,
        option_id: null,
        option_text: null,
      });
      expect(byPoll.get(pubClosed), "cerrada").toMatchObject({
        choice_hidden: false,
        option_text: "Rojo",
      });
      expect(r.text).not.toMatch(/total_votes|percentage|votes"\s*:/);
    }
    const own = await rpc("get_profile_votes", { p_username: STR.username }, STR.token);
    const mine = rows(own).find((x) => x.poll_id === pubOpen);
    expect(mine).toMatchObject({ choice_hidden: false, option_text: "Rojo" });
  });

  it("quien ve la cuenta privada ve la elección ajena sólo si votó esa encuesta o está cerrada", async () => {
    const r = await rpc("get_profile_votes", { p_username: FOL.username }, PRIV.token);
    const byPoll = new Map(rows(r).map((x) => [x.poll_id as string, x]));
    expect(byPoll.get(privOpen)).toMatchObject({ choice_hidden: true, option_id: null });
    expect(byPoll.get(privClosed)).toMatchObject({ choice_hidden: false, option_text: "Azul" });
  });

  it("get_poll_authors no revela la autoría de encuestas privadas a quien no las ve", async () => {
    const all = [pubOpen, privOpen, privClosed];
    for (const [, token] of viewers()) {
      const r = await rpc("get_poll_authors", { p_poll_ids: all }, token);
      expect(rows(r).map((x) => x.poll_id)).toEqual([pubOpen]);
      expect(r.text).not.toContain(PRIV.username);
    }
    const fol = await rpc("get_poll_authors", { p_poll_ids: all }, FOL.token);
    expect(rows(fol)).toHaveLength(3);
  });
});

describe("seguimientos", () => {
  it("follows: anon denegado y cada cuenta sólo ve sus propias relaciones", async () => {
    const anon = await http("/rest/v1/follows?select=*");
    expect(anon.status).toBeGreaterThanOrEqual(400);
    const str = await http("/rest/v1/follows?select=*", { token: STR.token });
    expect(str.text).toBe("[]");
    const fol = await http("/rest/v1/follows?select=follower_id,followee_id,status", {
      token: FOL.token,
    });
    expect(rows(fol)).toEqual([{ follower_id: FOL.id, followee_id: PRIV.id, status: "accepted" }]);
    const priv = await http("/rest/v1/follows?select=follower_id,status", { token: PRIV.token });
    expect(
      rows(priv)
        .map((x) => x.follower_id)
        .sort(),
    ).toEqual([FOL.id, PEN.id].sort());
  });

  it("nadie escribe en follows directamente: ni aceptarse, ni crear, ni borrar", async () => {
    const attempts = (token: string) => [
      http(`/rest/v1/follows?follower_id=eq.${PEN.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status: "accepted" }),
      }),
      http(`/rest/v1/follows`, {
        method: "POST",
        token,
        body: JSON.stringify({ follower_id: STR.id, followee_id: PRIV.id, status: "accepted" }),
      }),
      http(`/rest/v1/follows?follower_id=eq.${FOL.id}`, { method: "DELETE", token }),
    ];
    for (const token of [PEN.token, STR.token, PRIV.token]) {
      for (const r of await Promise.all(attempts(token))) {
        expect(r.status, r.text).toBeGreaterThanOrEqual(400);
      }
    }
  });

  it("una solicitud pendiente no se acepta sola ni por otra cuenta", async () => {
    // Volver a pedir seguir no la convierte en aceptada.
    const again = await rpc("follow_user", { p_username: PRIV.username }, PEN.token);
    expect(again.status).toBeLessThan(400);
    // Otra cuenta no puede responder a solicitudes ajenas.
    const stranger = await rpc(
      "respond_follow_request",
      { p_username: PEN.username, p_accept: true },
      STR.token,
    );
    expect(message(stranger)).toBe("USER_NOT_FOUND");
    // Ni expulsar a seguidores de otra cuenta.
    const kick = await rpc("remove_follower", { p_username: FOL.username }, STR.token);
    expect(kick.status).toBeLessThan(400);
    const { data } = await admin
      .from("follows")
      .select("follower_id, status")
      .eq("followee_id", PRIV.id)
      .order("status");
    expect(data).toEqual([
      { follower_id: FOL.id, status: "accepted" },
      { follower_id: PEN.id, status: "pending" },
    ]);
  });

  it("SEC-001: el control de cuota de seguimientos no se lee, escribe ni borra por REST", async () => {
    const seeded = await admin.from("follow_quota_events").insert({ user_id: FOL.id });
    expect(seeded.error).toBeNull();
    for (const token of [undefined, STR.token, FOL.token]) {
      const read = await http("/rest/v1/follow_quota_events?select=*", { token });
      expect(read.status, "lectura").toBeGreaterThanOrEqual(400);
      const write = await http("/rest/v1/follow_quota_events", {
        method: "POST",
        token,
        body: JSON.stringify({ user_id: STR.id }),
      });
      expect(write.status, "escritura").toBeGreaterThanOrEqual(400);
      const wipe = await http(`/rest/v1/follow_quota_events?user_id=eq.${FOL.id}`, {
        method: "DELETE",
        token,
      });
      expect(wipe.status, "borrado").toBeGreaterThanOrEqual(400);
    }
    // Ningún intento ha borrado el consumo sembrado de FOL.
    const { count } = await admin
      .from("follow_quota_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", FOL.id);
    expect(count).toBe(1);
  });

  it("anon no ejecuta las RPC que exigen sesión", async () => {
    for (const [name, args] of [
      ["follow_user", { p_username: PUB.username }],
      ["unfollow_user", { p_username: PUB.username }],
      ["respond_follow_request", { p_username: PEN.username, p_accept: true }],
      ["remove_follower", { p_username: FOL.username }],
      ["upsert_my_profile", { p_username: "intruso", p_display_name: null }],
      ["set_profile_privacy", { p_private: false }],
      ["get_my_profile", {}],
      ["report_poll", { p_poll_id: pubOpen, p_reason: "spam" }],
    ] as [string, object][]) {
      const r = await rpc(name, args);
      expect(r.status, name).toBeGreaterThanOrEqual(400);
    }
  });
});

describe("denuncias", () => {
  it("poll_reports no es legible ni escribible por ningún cliente, tampoco por quien denuncia", async () => {
    const report = await rpc("report_poll", { p_poll_id: pubOpen, p_reason: "spam" }, STR.token);
    expect(report.status).toBeLessThan(400);
    for (const token of [undefined, STR.token, PUB.token]) {
      for (const path of [
        "/rest/v1/poll_reports?select=*",
        "/rest/v1/poll_reports?select=reporter_id",
        `/rest/v1/polls?select=id,poll_reports(reason)&id=eq.${pubOpen}`,
      ]) {
        const r = await http(path, { token });
        expect(r.status, path).toBeGreaterThanOrEqual(400);
        expect(r.text, path).not.toContain(STR.id);
      }
    }
    const write = await http("/rest/v1/poll_reports", {
      method: "POST",
      token: STR.token,
      body: JSON.stringify({ poll_id: pubOpen, reporter_id: PEN.id, reason: "spam" }),
    });
    expect(write.status).toBeGreaterThanOrEqual(400);
    const { data } = await admin.from("poll_reports").select("reporter_id").eq("poll_id", pubOpen);
    expect(data).toEqual([{ reporter_id: STR.id }]);
  });

  it("denunciar dos veces la misma encuesta es ALREADY_REPORTED, no un segundo registro", async () => {
    const again = await rpc("report_poll", { p_poll_id: pubOpen, p_reason: "odio" }, STR.token);
    expect(message(again)).toBe("ALREADY_REPORTED");
  });
});

// BUG-005: seguir una cuenta pública se acepta al instante (sin solicitud) y una privada deja una
// sola solicitud pendiente aunque se pida dos veces a la vez (D-017). Cuentas propias de este bloque
// para no alterar las relaciones que comprueban las demás pruebas.
describe("BUG-005: seguir cuentas públicas y privadas", () => {
  const relationsOf = async (followee: Account) => {
    const { data, error } = await admin
      .from("follows")
      .select("follower_id, status")
      .eq("followee_id", followee.id)
      .order("follower_id");
    if (error) throw error;
    return data;
  };

  it("seguir una cuenta pública es accepted directo y no crea ninguna solicitud", async () => {
    const [target, follower] = await Promise.all([account("bpub", false), account("bseg", false)]);

    const first = await rpc("follow_user", { p_username: target.username }, follower.token);
    expect(first.status).toBe(200);
    expect(first.json).toBe("accepted");
    // Repetir es idempotente.
    expect((await rpc("follow_user", { p_username: target.username }, follower.token)).json).toBe(
      "accepted",
    );

    expect(await relationsOf(target)).toEqual([{ follower_id: follower.id, status: "accepted" }]);
    // La bandeja de la cuenta pública no recibe nada.
    const inbox = await rpc("list_follow_requests", {}, target.token);
    expect(rows(inbox)).toEqual([]);
  });

  it("una privada deja una sola solicitud pendiente aunque se pida dos veces a la vez", async () => {
    const [target, follower] = await Promise.all([account("bpriv", true), account("bsol", false)]);

    const both = await Promise.all([
      rpc("follow_user", { p_username: target.username }, follower.token),
      rpc("follow_user", { p_username: target.username }, follower.token),
    ]);
    for (const r of both) {
      expect(r.status, r.text).toBe(200);
      expect(r.json).toBe("pending");
    }
    expect(await relationsOf(target)).toEqual([{ follower_id: follower.id, status: "pending" }]);
    expect(rows(await rpc("list_follow_requests", {}, target.token))).toHaveLength(1);
    expect((await rpc("count_follow_requests", {}, target.token)).json).toBe(1);
  });

  it("mientras está pendiente el solicitante no ve las encuestas de la cuenta privada; al aceptar, sí", async () => {
    const [target, follower] = await Promise.all([account("bpriv", true), account("bpen", false)]);
    const poll = await createPoll(target, `¿BUG-005 ${Date.now()}?`);
    await rpc("follow_user", { p_username: target.username }, follower.token);

    const hidden = await http(`/rest/v1/polls?select=id&id=eq.${poll}`, { token: follower.token });
    expect(rows(hidden)).toEqual([]);
    const profileHidden = await rpc("get_profile", { p_username: target.username }, follower.token);
    expect(rows(profileHidden)[0]).toMatchObject({ can_view_content: false });

    const accepted = await rpc(
      "respond_follow_request",
      { p_username: follower.username, p_accept: true },
      target.token,
    );
    expect(accepted.status, accepted.text).toBeLessThan(400);

    const visible = await http(`/rest/v1/polls?select=id&id=eq.${poll}`, { token: follower.token });
    expect(rows(visible)).toEqual([{ id: poll }]);
    expect(rows(await rpc("list_follow_requests", {}, target.token))).toEqual([]);
    expect((await rpc("count_follow_requests", {}, target.token)).json).toBe(0);
  });

  it("el cambio de privacidad se persiste y respeta a quien ya sigue", async () => {
    const [target, accepted, pending] = await Promise.all([
      account("bcambio", false),
      account("bacep", false),
      account("bsoli", false),
    ]);
    await rpc("follow_user", { p_username: target.username }, accepted.token);
    expect(
      (await rpc("set_profile_privacy", { p_private: true }, target.token)).status,
    ).toBeLessThan(300);
    // Ya privada: el que seguía conserva el acceso y uno nuevo queda pendiente.
    expect((await rpc("follow_user", { p_username: target.username }, pending.token)).json).toBe(
      "pending",
    );
    expect(await relationsOf(target)).toEqual(
      expect.arrayContaining([
        { follower_id: accepted.id, status: "accepted" },
        { follower_id: pending.id, status: "pending" },
      ]),
    );
    // El valor persistido es el que lee cualquier cliente después.
    const persisted = await rpc("get_profile", { p_username: target.username });
    expect(rows(persisted)[0]).toMatchObject({ is_private: true });

    // Al hacerse pública, la solicitud pendiente pasa a aceptada.
    expect(
      (await rpc("set_profile_privacy", { p_private: false }, target.token)).status,
    ).toBeLessThan(300);
    expect(await relationsOf(target)).toEqual(
      expect.arrayContaining([
        { follower_id: accepted.id, status: "accepted" },
        { follower_id: pending.id, status: "accepted" },
      ]),
    );
    expect(rows(await rpc("get_profile", { p_username: target.username }))[0]).toMatchObject({
      is_private: false,
    });
  });
});

// PROFILE-001: la biografía no es una columna pública; sólo el titular la escribe y en cuentas
// privadas sólo la ven el titular y los seguidores aceptados.
describe("PROFILE-001: biografía de perfil", () => {
  const BIO = "Sólo para quien me sigue";

  it("no se lee ni se escribe por la tabla, con ningún rol", async () => {
    const owner = await account("bbio", true);
    for (const token of [undefined, owner.token, STR.token]) {
      const read = await http("/rest/v1/profiles?select=bio", { token });
      expect(read.status, "lectura").toBeGreaterThanOrEqual(400);
      const write = await http(`/rest/v1/profiles?user_id=eq.${owner.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ bio: "x" }),
      });
      expect(write.status, "escritura").toBeGreaterThanOrEqual(400);
    }
  });

  it("anon no ejecuta set_profile_bio y un extraño sin perfil no escribe nada", async () => {
    const anon = await rpc("set_profile_bio", { p_bio: "hola" });
    expect(anon.status).toBeGreaterThanOrEqual(400);
    const stranger = await account("bsinperfil", false);
    await admin.from("profiles").delete().eq("user_id", stranger.id);
    const r = await rpc("set_profile_bio", { p_bio: "hola" }, stranger.token);
    expect(message(r)).toBe("PROFILE_REQUIRED");
  });

  it("sobrelongitud y caracteres de control se rechazan; el HTML es texto literal", async () => {
    const owner = await account("bval", false);
    expect(message(await rpc("set_profile_bio", { p_bio: "a".repeat(281) }, owner.token))).toBe(
      "BIO_INVALID",
    );
    expect(message(await rpc("set_profile_bio", { p_bio: "hola\u0007" }, owner.token))).toBe(
      "BIO_INVALID",
    );
    const ok = await rpc("set_profile_bio", { p_bio: "<b>negrita</b>" }, owner.token);
    expect(ok.status, ok.text).toBeLessThan(300);
    const mine = await rpc("get_my_profile", {}, owner.token);
    expect(rows(mine)[0]).toMatchObject({ bio: "<b>negrita</b>" });
  });

  it("en una cuenta privada sólo titular y seguidor aceptado la ven, también por get_profile directo", async () => {
    const [owner, follower, pending, stranger] = await Promise.all([
      account("bpriv2", true),
      account("bfol", false),
      account("bpend", false),
      account("bext", false),
    ]);
    await rpc("set_profile_bio", { p_bio: BIO }, owner.token);
    await rpc("follow_user", { p_username: owner.username }, follower.token);
    await rpc(
      "respond_follow_request",
      { p_username: follower.username, p_accept: true },
      owner.token,
    );
    await rpc("follow_user", { p_username: owner.username }, pending.token);

    const bioFor = async (token?: string) =>
      rows(await rpc("get_profile", { p_username: owner.username }, token))[0]?.bio ?? null;
    expect(await bioFor(owner.token)).toBe(BIO);
    expect(await bioFor(follower.token)).toBe(BIO);
    expect(await bioFor(pending.token)).toBeNull();
    expect(await bioFor(stranger.token)).toBeNull();
    expect(await bioFor(undefined)).toBeNull();
    // Ni la cabecera pública ni ningún otro endpoint la filtran.
    const hidden = await rpc("get_profile", { p_username: owner.username }, stranger.token);
    expect(hidden.text).not.toContain(BIO);
    const authors = await rpc("get_poll_authors", { p_poll_ids: [] }, stranger.token);
    expect(authors.text).not.toContain(BIO);
  });
});

// SOCIAL-001: bloqueo entre cuentas. Matriz de actores por HTTP real: bloqueante, bloqueada,
// tercera y visitante. El contenido público sigue visible sin sesión (límite documentado).
describe("SOCIAL-001: bloqueo de personas", () => {
  const visible = async (poll: string, token?: string) =>
    rows(await http(`/rest/v1/polls?select=id&id=eq.${poll}`, { token })).length === 1;

  it("el bloqueo oculta a las dos cuentas entre sí, no a terceros ni a visitantes, y cancela seguimientos", async () => {
    const [a, b, c] = await Promise.all([
      account("kblk", false),
      account("kblo", false),
      account("ktrc", false),
    ]);
    const [pa, pb] = [
      await createPoll(a, `¿Bloqueo A ${Date.now()}?`),
      await createPoll(b, `¿Bloqueo B ${Date.now()}?`),
    ];
    await rpc("follow_user", { p_username: a.username }, b.token);
    await rpc("follow_user", { p_username: b.username }, a.token);
    await vote(b, pa, 0);

    expect((await rpc("block_user", { p_username: b.username }, a.token)).status).toBeLessThan(300);

    expect(await visible(pb, a.token)).toBe(false);
    expect(await visible(pa, b.token)).toBe(false);
    expect(await visible(pa, a.token)).toBe(true);
    expect(await visible(pa, c.token)).toBe(true);
    expect(await visible(pa, undefined)).toBe(true);
    // Cada una "no existe" para la otra; la tercera sí las ve.
    expect(message(await rpc("get_profile", { p_username: b.username }, a.token))).toBe(
      "USER_NOT_FOUND",
    );
    expect(message(await rpc("get_profile", { p_username: a.username }, b.token))).toBe(
      "USER_NOT_FOUND",
    );
    expect(rows(await rpc("get_profile", { p_username: a.username }, c.token))).toHaveLength(1);
    // Seguimientos cancelados y no se pueden recrear en ningún sentido.
    for (const [who, target] of [
      [a, b],
      [b, a],
    ] as const) {
      expect(message(await rpc("follow_user", { p_username: target.username }, who.token))).toBe(
        "USER_NOT_FOUND",
      );
    }
    const { data: rel } = await admin
      .from("follows")
      .select("follower_id")
      .in("follower_id", [a.id, b.id])
      .in("followee_id", [a.id, b.id]);
    expect(rel).toEqual([]);
    // El voto previo de b sigue en la encuesta de a.
    const { data: votes } = await admin.from("votes").select("user_id").eq("poll_id", pa);
    expect(votes).toEqual([{ user_id: b.id }]);
    // El feed de b no incluye a la encuesta de a.
    const feed = await rpc("get_feed", { p_mode: "recientes" }, b.token);
    expect(rows(feed).map((r) => r.poll_id)).not.toContain(pa);
  });

  it("nadie lee ni escribe user_blocks, ni ve quién lo ha bloqueado, ni levanta bloqueos ajenos", async () => {
    const [a, b] = await Promise.all([account("klst", false), account("klsb", false)]);
    await rpc("block_user", { p_username: b.username }, a.token);

    for (const token of [undefined, a.token, b.token]) {
      expect(
        (await http("/rest/v1/user_blocks?select=*", { token })).status,
      ).toBeGreaterThanOrEqual(400);
      const write = await http("/rest/v1/user_blocks", {
        method: "POST",
        token,
        body: JSON.stringify({ blocker_id: b.id, blocked_id: a.id }),
      });
      expect(write.status).toBeGreaterThanOrEqual(400);
    }
    expect(rows(await rpc("list_blocked_users", {}, a.token)).map((r) => r.username)).toEqual([
      b.username,
    ]);
    expect(rows(await rpc("list_blocked_users", {}, b.token))).toEqual([]);
    expect((await rpc("list_blocked_users", {})).status).toBeGreaterThanOrEqual(400);
    // b no puede levantar el bloqueo de a.
    await rpc("unblock_user", { p_username: a.username }, b.token);
    const { data } = await admin.from("user_blocks").select("blocker_id").eq("blocked_id", b.id);
    expect(data).toEqual([{ blocker_id: a.id }]);
    expect(message(await rpc("block_user", { p_username: a.username }, a.token))).toBe(
      "CANNOT_BLOCK_SELF",
    );
  });

  it("concurrencia: un seguimiento simultáneo a un bloqueo nunca deja una relación viva", async () => {
    for (let i = 0; i < 5; i++) {
      const [a, b] = await Promise.all([account("kcca", false), account("kccb", false)]);
      await Promise.all([
        rpc("block_user", { p_username: b.username }, a.token),
        rpc("follow_user", { p_username: a.username }, b.token),
        rpc("follow_user", { p_username: b.username }, a.token),
      ]);
      const { data } = await admin
        .from("follows")
        .select("follower_id")
        .in("follower_id", [a.id, b.id])
        .in("followee_id", [a.id, b.id]);
      expect(data, `iteración ${i}`).toEqual([]);
    }
  });
});

// SEARCH-001: búsqueda por pregunta. Devuelve sólo ids, fecha y cursor, respeta cuentas privadas y
// bloqueos y no revela recuentos de encuestas abiertas. Reutiliza las encuestas «V2-024» ya creadas.
describe("SEARCH-001: búsqueda de encuestas", () => {
  const search = (q: string, token?: string, cursor?: string) =>
    rpc("search_polls", { p_query: q, ...(cursor ? { p_cursor: cursor } : {}) }, token);
  const ids = (r: Reply) => rows(r).map((x) => x.poll_id);

  it("el visitante y los extraños sólo encuentran lo público; los privados, sólo quien puede verlos", async () => {
    for (const token of [undefined, STR.token, PEN.token]) {
      const found = ids(await search("V2-024", token));
      expect(found).toContain(pubOpen);
      expect(found).toContain(pubClosed);
      expect(found).not.toContain(privOpen);
      expect(found).not.toContain(privClosed);
    }
    for (const token of [PRIV.token, FOL.token]) {
      const found = ids(await search("V2-024", token));
      expect(found).toEqual(expect.arrayContaining([pubOpen, pubClosed, privOpen, privClosed]));
    }
  });

  it("no devuelve recuentos, totales ni datos de resultados: solo id, fecha y cursor", async () => {
    for (const token of [undefined, STR.token, FOL.token]) {
      const r = await search("V2-024", token);
      expect(r.status).toBe(200);
      for (const row of rows(r)) {
        expect(Object.keys(row).sort()).toEqual(["created_at", "cursor", "poll_id"]);
      }
      expect(r.text).not.toMatch(/votes|total|count|percent|option/i);
    }
  });

  it("valida la consulta y trata los caracteres especiales como texto", async () => {
    for (const bad of ["", " ", "a", "x".repeat(101)]) {
      expect(message(await search(bad))).toBe("INVALID_QUERY");
    }
    for (const odd of ["%%", "__", "'; drop table polls; --", "\\\\", '""', "V2_024"]) {
      const r = await search(odd);
      expect(r.status, odd).toBe(200);
      expect(ids(r), odd).not.toContain(privOpen);
    }
    expect(ids(await search("V2_024"))).toEqual([]);
    expect(rows(await http("/rest/v1/polls?select=id&limit=1")).length).toBe(1);
  });

  it("un cursor de otra búsqueda o ilegible se rechaza", async () => {
    const first = rows(await search("V2-024"));
    expect(first.length).toBeGreaterThan(0);
    const cursor = first[0].cursor as string;
    expect(message(await search("otra cosa", undefined, cursor))).toBe("INVALID_CURSOR");
    expect(message(await search("V2-024", undefined, "no-es-un-cursor"))).toBe("INVALID_CURSOR");
  });

  it("el bloqueo oculta las encuestas del otro en la búsqueda, en los dos sentidos", async () => {
    const [a, b] = await Promise.all([account("sbla", false), account("sblb", false)]);
    const marca = `zanahoria${Date.now()}`;
    const [pa, pb] = [
      await createPoll(a, `¿${marca} de A?`),
      await createPoll(b, `¿${marca} de B?`),
    ];
    expect(ids(await search(marca, a.token))).toEqual(expect.arrayContaining([pa, pb]));

    await rpc("block_user", { p_username: b.username }, a.token);
    expect(ids(await search(marca, a.token))).toEqual([pa]);
    expect(ids(await search(marca, b.token))).toEqual([pb]);
    expect(ids(await search(marca, undefined))).toEqual(expect.arrayContaining([pa, pb]));
  });
});

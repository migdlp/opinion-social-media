// PERF-004: get_poll_cards por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra que nadie, ni la
// autora, obtiene agregados de una abierta sin votar; que la respuesta no lleva user_id ni datos de
// otros votantes; que los guardados ajenos no se filtran; y que ocultas, privadas y bloqueos se
// omiten sin distinguirse de un id inexistente. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-cards-test-only";

type Account = { id: string; token: string; username: string };
async function account(label: string, isPrivate = false): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@cards.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `pc${id.replaceAll("-", "").slice(0, 14)}`;
  const inserted = await admin
    .from("profiles")
    .insert({ user_id: id, username, is_private: isPrivate });
  if (inserted.error) throw inserted.error;
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (session.error) throw session.error;
  return { id, username, token: session.data.session!.access_token };
}

type Card = {
  poll_id: string;
  author_username: string | null;
  my_option_id: string | null;
  total_votes: number | null;
  results: { option_id: string; votes: number; percentage: number }[] | null;
  options: { id: string; text: string; position: number }[];
  saved: boolean;
  [key: string]: unknown;
};
async function cards(ids: unknown, token?: string, extra: object = {}) {
  const res = await fetch(`${URL_}/rest/v1/rpc/get_poll_cards`, {
    method: "POST",
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_poll_ids: ids, ...extra }),
  });
  const text = await res.text();
  return { status: res.status, text, data: (text ? JSON.parse(text) : null) as Card[] };
}

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

let author: Account, voter: Account, stranger: Account, priv: Account, blocked: Account;
let open: Awaited<ReturnType<typeof newPoll>>;
let closed: Awaited<ReturnType<typeof newPoll>>;
let hidden: Awaited<ReturnType<typeof newPoll>>;
let secret: Awaited<ReturnType<typeof newPoll>>;

beforeAll(async () => {
  [author, voter, stranger, priv, blocked] = await Promise.all([
    account("autora"),
    account("votante"),
    account("extrana"),
    account("privada", true),
    account("bloqueada"),
  ]);
  open = await newPoll(author, "¿Encuesta abierta con un voto de la votante?");
  closed = await newPoll(author, "¿Encuesta cerrada con dos votos?", {
    created_at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
  });
  hidden = await newPoll(author, "¿Encuesta oculta por moderación?", { status: "hidden" });
  secret = await newPoll(priv, "¿Encuesta de una cuenta privada?");
  const votes = await admin.from("votes").insert([
    { poll_id: open.id, option_id: open.options[0], user_id: voter.id },
    { poll_id: closed.id, option_id: closed.options[0], user_id: voter.id },
    { poll_id: closed.id, option_id: closed.options[1], user_id: stranger.id },
  ]);
  if (votes.error) throw votes.error;
  const closing = await admin
    .from("polls")
    .update({ closes_at: new Date(Date.now() - 2 * 86_400_000).toISOString() })
    .eq("id", closed.id);
  if (closing.error) throw closing.error;
  const saved = await admin.from("saved_polls").insert([
    { user_id: stranger.id, poll_id: open.id },
    { user_id: voter.id, poll_id: closed.id },
  ]);
  if (saved.error) throw saved.error;
  const block = await admin
    .from("user_blocks")
    .insert({ blocker_id: author.id, blocked_id: blocked.id });
  if (block.error) throw block.error;
}, 90_000);

const ALL = () => [open.id, closed.id, hidden.id, secret.id];

describe("get_poll_cards por HTTP", () => {
  it("ni anon ni la autora ni una extraña obtienen agregados de una abierta sin votar", async () => {
    for (const who of [undefined, author.token, stranger.token]) {
      const r = await cards([open.id], who);
      expect(r.status).toBe(200);
      expect(r.data).toHaveLength(1);
      expect(r.data[0].results).toBeNull();
      expect(r.data[0].total_votes).toBeNull();
      expect(r.data[0].my_option_id).toBeNull();
      // Las opciones no llevan recuentos y el texto no contiene el reparto.
      expect(JSON.stringify(r.data[0].options)).not.toMatch(/votes|percentage/);
    }
  });

  it("quien votó la abierta ve su reparto y su opción", async () => {
    const r = await cards([open.id], voter.token);
    expect(r.data[0].my_option_id).toBe(open.options[0]);
    expect(r.data[0].total_votes).toBe(1);
    expect(r.data[0].results?.map((x) => x.percentage)).toEqual([100, 0]);
  });

  it("una cerrada es pública: resultados para anon, sin voto propio ni guardada", async () => {
    const r = await cards([closed.id]);
    expect(r.data[0].total_votes).toBe(2);
    expect(r.data[0].results?.map((x) => x.percentage)).toEqual([50, 50]);
    expect(r.data[0].my_option_id).toBeNull();
    expect(r.data[0].saved).toBe(false);
  });

  it("la respuesta no lleva user_id, fechas de voto ni datos de otros votantes", async () => {
    for (const who of [undefined, author.token, voter.token]) {
      const r = await cards(ALL(), who);
      for (const forbidden of [
        "user_id",
        "voter_id",
        "voted_at",
        author.id,
        voter.id,
        stranger.id,
        priv.id,
      ]) {
        expect(r.text, String(forbidden)).not.toContain(forbidden);
      }
      for (const card of r.data) {
        expect(Object.keys(card).sort()).toEqual(
          [
            "author_display_name",
            "author_username",
            "category_name",
            "category_slug",
            "closes_at",
            "comments_enabled",
            "created_at",
            "my_option_id",
            "options",
            "poll_id",
            "question",
            "results",
            "saved",
            "total_votes",
          ].sort(),
        );
      }
    }
  });

  it("los guardados de otras cuentas no se filtran", async () => {
    // La extraña guardó la abierta y la votante la cerrada; cada una sólo ve lo suyo.
    expect((await cards([open.id], voter.token)).data[0].saved).toBe(false);
    expect((await cards([open.id], stranger.token)).data[0].saved).toBe(true);
    expect((await cards([closed.id], stranger.token)).data[0].saved).toBe(false);
    expect((await cards([closed.id], voter.token)).data[0].saved).toBe(true);
    expect((await cards([open.id, closed.id])).data.some((c) => c.saved)).toBe(false);
  });

  it("oculta, privada sin seguir, inexistente y bloqueo se omiten igual", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    const r = await cards([hidden.id, secret.id, missing], stranger.token);
    expect(r.status).toBe(200);
    expect(r.data).toEqual([]);
    // Ni siquiera la autora recibe su oculta por esta vía.
    expect((await cards([hidden.id], author.token)).data).toEqual([]);
    // Anon tampoco ve la privada.
    expect((await cards([secret.id])).data).toEqual([]);
    // La cuenta bloqueada por la autora no ve sus encuestas, como si no existieran.
    expect((await cards([open.id, closed.id], blocked.token)).data).toEqual([]);
    // La dueña de la privada sí ve la suya.
    expect((await cards([secret.id], priv.token)).data).toHaveLength(1);
  });

  it("mezclar ids no filtra agregados: cada tarjeta decide por sí misma", async () => {
    const r = await cards([closed.id, open.id], stranger.token);
    expect(r.data.map((c) => c.poll_id)).toEqual([closed.id, open.id]);
    expect(r.data[0].results).not.toBeNull();
    expect(r.data[1].results).toBeNull();
  });

  it("devuelve como mucho 20 tarjetas, sin duplicados y en el orden pedido", async () => {
    const polls = await Promise.all(
      Array.from({ length: 21 }, (_, i) => newPoll(author, `¿Encuesta de relleno número ${i}?`)),
    );
    const ids = polls.map((p) => p.id);
    const r = await cards(ids, stranger.token);
    expect(r.data.map((c) => c.poll_id)).toEqual(ids.slice(0, 20));
    const dup = await cards([ids[1], ids[0], ids[1]], stranger.token);
    expect(dup.data.map((c) => c.poll_id)).toEqual([ids[1], ids[0]]);
  });

  it("entradas vacías o nulas dan 0 filas y no hay forma de pasar otra identidad", async () => {
    expect((await cards([], voter.token)).data).toEqual([]);
    expect((await cards(null, voter.token)).data).toEqual([]);
    const extra = await cards([open.id], stranger.token, { p_user_id: voter.id });
    expect(extra.status).toBe(404); // PGRST202: no existe esa firma
  });
});

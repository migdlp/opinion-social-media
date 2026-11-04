// SEARCH-003: búsqueda de personas por HTTP real (PostgREST) contra Supabase LOCAL. Demuestra que la
// búsqueda es pública pero sólo expone columnas ya públicas (nunca user_id ni bio), que las cuentas
// bloqueadas en cualquier sentido no aparecen, que las privadas sí, que %, _ y \ son literales y que
// la consulta y el cursor manipulados se rechazan sin error del servidor. Sólo datos sintéticos.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-searchusers-test-only";
const RUN = Math.random().toString(36).slice(2, 8);

type Account = { id: string; token: string; username: string };
async function account(
  label: string,
  opts: { isPrivate?: boolean; displayName?: string; bio?: string } = {},
): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@searchusers.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `su${RUN}${label}`.toLowerCase().slice(0, 20);
  const inserted = await admin.from("profiles").insert({
    user_id: id,
    username,
    is_private: opts.isPrivate ?? false,
    display_name: opts.displayName ?? null,
    bio: opts.bio ?? null,
  });
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

type Hit = { username: string; display_name: string | null; is_private: boolean; cursor: string };
const search = async (q: string, token?: string, cursor?: string) => {
  const r = await rpc("search_users", { p_query: q, p_cursor: cursor ?? null }, token);
  return r;
};

let seeker: Account, open: Account, hidden: Account, blocker: Account, blocked: Account;
let named: Account;

beforeAll(async () => {
  [seeker, open, hidden, blocker, blocked, named] = await Promise.all([
    account("busca"),
    account("abierta", { bio: "bio-muy-secreta" }),
    account("privada", { isPrivate: true, bio: "bio-privada-secreta" }),
    account("meblock"),
    account("blocked"),
    account("nombre", { displayName: `Zorro${RUN} 100%` }),
  ]);
  const blocks = await admin.from("user_blocks").insert([
    { blocker_id: seeker.id, blocked_id: blocked.id },
    { blocker_id: blocker.id, blocked_id: seeker.id },
  ]);
  if (blocks.error) throw blocks.error;
}, 90_000);

describe("la búsqueda es pública y sólo expone columnas públicas", () => {
  it("anon encuentra cuentas públicas y privadas, sin user_id, bio ni otros campos", async () => {
    const r = await search(`su${RUN}`);
    expect(r.status).toBe(200);
    const names = (r.data as Hit[]).map((h) => h.username);
    expect(names).toEqual(expect.arrayContaining([open.username, hidden.username]));
    expect(r.text).not.toMatch(/user_id|bio|secreta|follower|[0-9a-f]{8}-[0-9a-f]{4}-/i);
    for (const hit of r.data as Hit[]) {
      expect(Object.keys(hit).sort()).toEqual(
        ["avatar_icon", "cursor", "display_name", "is_private", "username"].sort(),
      );
    }
    const priv = (r.data as Hit[]).find((h) => h.username === hidden.username)!;
    expect(priv.is_private).toBe(true);
  });

  it("argumentos manipulados (user_id, bio) no se aceptan: 404", async () => {
    for (const body of [
      { p_query: "ana", p_user_id: open.id },
      { p_query: "ana", p_bio: "x" },
    ]) {
      expect((await rpc("search_users", body)).status).toBe(404);
    }
  });

  it("buscar por un trozo de la bio no encuentra a nadie", async () => {
    const r = await search("muy-secreta");
    expect(r.status).toBe(200);
    expect(r.data).toEqual([]);
  });
});

describe("bloqueos", () => {
  it("quien bloqueé y quien me bloqueó no aparecen; sin sesión sí", async () => {
    const mine = await search(`su${RUN}`, seeker.token);
    const names = (mine.data as Hit[]).map((h) => h.username);
    expect(names).toContain(open.username);
    expect(names).not.toContain(blocked.username);
    expect(names).not.toContain(blocker.username);
    const anon = (await search(`su${RUN}`)).data as Hit[];
    expect(anon.map((h) => h.username)).toEqual(
      expect.arrayContaining([blocked.username, blocker.username]),
    );
  });
});

describe("consulta y cursor", () => {
  it("@usuario equivale a usuario; por nombre también se encuentra", async () => {
    const a = await search(open.username);
    const b = await search(`@${open.username}`);
    expect((a.data as Hit[]).map((h) => h.username)).toEqual(
      (b.data as Hit[]).map((h) => h.username),
    );
    const byName = await search(`zorro${RUN}`);
    expect((byName.data as Hit[]).map((h) => h.username)).toEqual([named.username]);
  });

  it("%, _ y \\ son texto literal, no comodines", async () => {
    // El nombre contiene «100%»: «0%» sólo lo encuentra tal cual; «%%» y «\\» no devuelven nada.
    expect(((await search("0%")).data as Hit[]).map((h) => h.username)).toEqual([named.username]);
    expect((await search("%%")).data).toEqual([]);
    expect((await search("\\\\")).data).toEqual([]);
    expect((await search("_%_")).data).toEqual([]);
  });

  it("consultas fuera de 2–30 caracteres dan INVALID_QUERY (400), nunca error del servidor", async () => {
    for (const q of ["a", "@a", "", "   ", "a".repeat(31), "@"]) {
      const r = await search(q);
      expect(r.status).toBe(400);
      expect(r.data.message).toBe("INVALID_QUERY");
    }
    expect((await rpc("search_users", { p_query: null })).status).toBe(400);
    const sql = await search("'; drop table profiles; --");
    expect(sql.status).toBe(200);
    expect(sql.data).toEqual([]);
  });

  it("un cursor de otra búsqueda o manipulado da INVALID_CURSOR", async () => {
    const first = (await search(`su${RUN}`, undefined)).data as Hit[];
    const cursor = first[0].cursor;
    const other = await search(`otro${RUN}`, undefined, cursor);
    expect(other.status).toBe(400);
    expect(other.data.message).toBe("INVALID_CURSOR");
    for (const bad of ["basura", "x|a|b", "9|a|b", "1||b"]) {
      const r = await search(`su${RUN}`, undefined, bad);
      expect(r.status).toBe(400);
      expect(r.data.message).toBe("INVALID_CURSOR");
    }
    // Un cursor propio válido continúa la misma búsqueda sin repetir el elemento.
    const next = await search(`su${RUN}`, undefined, cursor);
    expect(next.status).toBe(200);
    expect((next.data as Hit[]).map((h) => h.username)).not.toContain(first[0].username);
  });
});

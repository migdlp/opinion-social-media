// ACCOUNT-003: exportar los datos propios por HTTP contra Supabase LOCAL real (GoTrue + PostgREST).
// Demuestra que anon no puede, que no hay forma de pedir los datos de otra cuenta, que el JSON no
// filtra nada ajeno y que el límite de 10 minutos se impone también con peticiones simultáneas.
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) throw new Error("Sólo Supabase local");
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const admin = createClient(URL_, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const PASSWORD = "local-export-test-only";

type Account = { id: string; email: string; token: string; username: string };
async function account(label: string): Promise<Account> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@export.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;
  const username = `exp${id.replaceAll("-", "").slice(0, 12)}`;
  const inserted = await admin.from("profiles").insert({ user_id: id, username });
  if (inserted.error) throw inserted.error;
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const session = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (session.error) throw session.error;
  return { id, email, username, token: session.data.session!.access_token };
}

async function rpc(name: string, args: object, token?: string) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

let me: Account, other: Account, third: Account;

beforeAll(async () => {
  [me, other, third] = await Promise.all([
    account("exporta"),
    account("ajena"),
    account("tercera"),
  ]);
  const created = await Promise.all([
    rpc(
      "create_poll",
      { p_question: "¿Esta encuesta es mía y sale?", p_options: ["Sí", "No"] },
      me.token,
    ),
    rpc(
      "create_poll",
      { p_question: "¿Esta encuesta es ajena y no sale?", p_options: ["Sí", "No"] },
      other.token,
    ),
  ]);
  expect(created.map((r) => r.status)).toEqual([200, 200]);
}, 60_000);

describe("exportar mis datos por HTTP", () => {
  it("anon no puede ejecutar export_my_data", async () => {
    const r = await rpc("export_my_data", {});
    expect([401, 403]).toContain(r.status);
  });

  it("no hay forma de indicar otra identidad", async () => {
    for (const extra of [{ p_user_id: other.id }, { p_target: other.id }, { user_id: other.id }]) {
      const r = await rpc("export_my_data", extra, me.token);
      expect(r.status).toBe(404); // PGRST202: no existe esa firma
    }
  });

  it("devuelve lo propio y nada ajeno", async () => {
    const r = await rpc("export_my_data", {}, me.token);
    expect(r.status).toBe(200);
    expect(r.data.formato).toBe("opinion-export");
    expect(r.data.cuenta.email).toBe(me.email);
    expect(r.data.perfil.usuario).toBe(me.username);
    expect(r.data.encuestas).toHaveLength(1);
    const text = JSON.stringify(r.data);
    for (const secret of [other.id, other.email, other.username, me.id, "es ajena y no sale"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("una segunda petición antes de 10 minutos se rechaza", async () => {
    const r = await rpc("export_my_data", {}, me.token);
    expect(r.status).toBe(400);
    expect(r.data.message).toBe("DATA_EXPORT_RATE_LIMITED");
  });

  it("peticiones simultáneas de la misma cuenta: sólo una pasa", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => rpc("export_my_data", {}, other.token)),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(
      results.filter((r) => r.status === 400 && r.data.message === "DATA_EXPORT_RATE_LIMITED"),
    ).toHaveLength(7);
    const events = await admin
      .from("data_export_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", other.id);
    expect(events.count).toBe(1);
  });

  it("el límite de una cuenta no afecta a otra y la tabla de eventos no es legible", async () => {
    expect((await rpc("export_my_data", {}, third.token)).status).toBe(200);
    const res = await fetch(`${URL_}/rest/v1/data_export_events?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${third.token}` },
    });
    expect([401, 403]).toContain(res.status);
  });
});

// Preparación de datos y sesiones para los E2E. Sólo contra Supabase LOCAL: usa la
// clave secreta de la pila local para crear usuarios y la contraseña local para obtener
// su sesión. La cookie la genera @supabase/ssr, igual que tras el callback de Google.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(URL_)) {
  throw new Error(
    `E2E sólo contra Supabase local (http://127.0.0.1:<puerto>); recibido: ${URL_ || "(vacío)"}`,
  );
}

const PASSWORD = "local-e2e-password-045";

export const admin = createClient(URL_, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type TestUser = { id: string; email: string; username: string | null };

let counter = 0;

// profile: false deja la cuenta sin @usuario (como tras el primer login, antes del onboarding);
// isPrivate: true crea el perfil como cuenta privada (V2-005).
export async function createUser(
  label: string,
  options: { profile?: boolean; isPrivate?: boolean } = {},
): Promise<TestUser> {
  const email = `${label}-${Date.now()}-${counter++}@e2e.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  if (options.profile === false) return { id: data.user.id, email, username: null };
  // Crear y votar exigen @usuario (V2-002): se crea el perfil como tras el onboarding.
  const username = `${label}${Date.now() % 1_000_000}${counter}`.slice(0, 20);
  const profile = await admin
    .from("profiles")
    .insert({ user_id: data.user.id, username, is_private: options.isPrivate ?? false });
  if (profile.error) throw profile.error;
  return { id: data.user.id, email, username };
}

// Inicia sesión como `user` en el contexto del navegador con las cookies de @supabase/ssr.
export async function signIn(context: BrowserContext, user: TestUser, baseURL: string) {
  const jar = new Map<string, string>();
  const supabase = createServerClient(URL_, PUBLISHABLE, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: PASSWORD,
  });
  if (error) throw error;
  await context.addCookies(
    [...jar].map(([name, value]) => ({ name, value, url: baseURL, sameSite: "Lax" as const })),
  );
}

async function clientAs(user: TestUser) {
  const client = createClient(URL_, PUBLISHABLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: PASSWORD,
  });
  if (error) throw error;
  return client;
}

// Encuesta publicada por `user` mediante la RPC real (con su propia sesión).
export async function createPoll(user: TestUser, question: string, options: string[]) {
  const client = await clientAs(user);
  const { data, error } = await client.rpc("create_poll", {
    p_question: question,
    p_options: options,
  });
  if (error) throw error;
  return data as string;
}

// Voto de `user` mediante la RPC real; `optionIndex` según el orden de las opciones.
export async function vote(user: TestUser, pollId: string, optionIndex: number) {
  const client = await clientAs(user);
  const { data: options, error: optionsError } = await client
    .from("poll_options")
    .select("id")
    .eq("poll_id", pollId)
    .order("position");
  if (optionsError) throw optionsError;
  const { error } = await client.rpc("vote_poll", {
    p_poll_id: pollId,
    p_option_id: options[optionIndex].id,
  });
  if (error) throw error;
}

export async function hidePoll(id: string) {
  const { error } = await admin.from("polls").update({ status: "hidden" }).eq("id", id);
  if (error) throw error;
}

// Votos guardados de una encuesta (vía clave secreta local, ignora RLS).
export async function votesOf(pollId: string) {
  const { data, error } = await admin
    .from("votes")
    .select("user_id, option_id")
    .eq("poll_id", pollId);
  if (error) throw error;
  return data;
}

// Encuesta sembrada con la clave secreta local (sin pasar por create_poll, que limita a 5 por hora y
// autor). category: slug de la lista cerrada o null. Queda abierta; para cerrarla tras votar, closePoll.
export async function seedPoll(
  author: TestUser,
  question: string,
  options: { category?: string | null; options?: string[] } = {},
) {
  const inserted = await admin
    .from("polls")
    .insert({ user_id: author.id, question, category_slug: options.category ?? null })
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;
  const id = inserted.data.id as string;
  const texts = options.options ?? ["Sí", "No"];
  const opts = await admin
    .from("poll_options")
    .insert(texts.map((text, index) => ({ poll_id: id, text, position: index + 1 })));
  if (opts.error) throw opts.error;
  return id;
}

// Cierra una encuesta hace `hoursAgo` horas (la crea antes para cumplir closes_at > created_at).
export async function closePoll(pollId: string, hoursAgo: number) {
  const closes = new Date(Date.now() - hoursAgo * 3_600_000);
  const created = new Date(closes.getTime() - 48 * 3_600_000);
  const { error } = await admin
    .from("polls")
    .update({ created_at: created.toISOString(), closes_at: closes.toISOString() })
    .eq("id", pollId);
  if (error) throw error;
}

// Relación de seguimiento creada sin pasar por follow_user (cuota de 60 minutos).
export async function addFollow(
  follower: TestUser,
  followee: TestUser,
  status: "accepted" | "pending",
) {
  const { error } = await admin
    .from("follows")
    .upsert({ follower_id: follower.id, followee_id: followee.id, status });
  if (error) throw error;
}

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

export type TestUser = { id: string; email: string };

let counter = 0;

export async function createUser(label: string): Promise<TestUser> {
  const email = `${label}-${Date.now()}-${counter++}@e2e.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user.id, email };
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

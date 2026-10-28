import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

// Lecturas para rastreadores: nunca heredan cookies, JWT ni almacenamiento de sesión.
// Sin caché: una encuesta ocultada o privatizada no debe conservar su imagen pública.
export function createAnonymousClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

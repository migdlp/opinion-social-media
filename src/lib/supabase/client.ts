import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Cliente para componentes de cliente ("use client"). La sesión viaja en cookies,
// compartidas con el cliente de servidor. Sólo usa URL y clave publicable.
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}

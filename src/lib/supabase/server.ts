import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Cliente para Server Components, Server Actions y Route Handlers. Lee la sesión
// de las cookies de la petición; sin cookies actúa como visitante (rol anon).
// Al leer cookies, quien lo use se renderiza por petición y nunca se cachea.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies. La renovación de la
          // sesión se hará en el proxy de Next.js (MVP-006).
        }
      },
    },
  });
}

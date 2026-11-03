import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hardenAuthCookies, isSecureRequest } from "@/lib/supabase/cookies";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Renueva la sesión de Supabase en cada petición de página: getClaims() refresca el token
// caducado y las cookies nuevas se copian a la petición (para el render) y a la respuesta
// (para el navegador). Los Server Components no pueden escribir cookies (ver server.ts).
// Un fallo de Supabase no rompe la página: el usuario sigue como visitante.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();
  const secure = isSecureRequest(request.headers, request.nextUrl.href);

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of hardenAuthCookies(cookiesToSet, secure)) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Sin red o sesión ilegible: se sirve la página como visitante.
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

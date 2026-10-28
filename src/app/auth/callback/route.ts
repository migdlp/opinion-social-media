import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Retorno de Google OAuth (flujo PKCE): Supabase redirige aquí con ?code. Se canjea por
// la sesión, que queda en cookies, y se vuelve a un destino local seguro. Cualquier fallo
// lleva a /login con un código genérico: nunca se muestra el error técnico.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");

  const failed = () => {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "auth");
    if (next !== "/") login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  };

  if (!code || searchParams.has("error")) return failed();

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed();
  } catch {
    return failed();
  }

  return NextResponse.redirect(new URL(next, origin));
}

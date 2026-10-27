"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión (borra las cookies) y vuelve al feed como visitante. Si Supabase no
// responde se vuelve igualmente: no se muestra ningún error técnico.
export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Sin red: la cabecera se recalcula con la sesión que quede en cookies.
  }
  redirect("/");
}

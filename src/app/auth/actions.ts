"use server";

import { redirect } from "next/navigation";
import { toAppError } from "@/lib/data/errors";
import type { Result } from "@/lib/data/types";
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

// Cierra la sesión en TODOS los dispositivos (AUTH-002): scope «global» revoca todos los refresh
// tokens de la cuenta y, además, limpia las cookies de esta sesión. Los access tokens ya emitidos
// siguen valiendo hasta que caducan (por defecto 1 hora). A diferencia de signOut, un fallo no se
// disimula: no se redirige, la sesión local sigue abierta y se devuelve el error para mostrarlo en
// el diálogo. Nunca lanza hacia la interfaz.
export async function signOutEverywhere(): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) return { ok: false, error: toAppError(error) };
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
  redirect("/?sesion=cerrada");
}

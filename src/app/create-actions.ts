"use server";

import { createPoll } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Publica una encuesta del usuario con sesión. Sin sesión no se llega a la base de datos; con
// ella, create_poll valida los datos y aplica la cuota en Supabase. Nunca se lanzan errores
// hacia la interfaz.
export async function publishPoll(
  question: string,
  options: string[],
): Promise<Result<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await createPoll(supabase, question, options);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

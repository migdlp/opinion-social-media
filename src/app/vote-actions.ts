"use server";

import { votePoll } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { PollResults, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Emite el voto del usuario con sesión. Sin sesión no se llega a la base de datos; con ella,
// vote_poll impone en Supabase el voto único y la elegibilidad. Un voto repetido devuelve ok
// con los resultados (ver votePoll) y nunca se lanzan errores hacia la interfaz.
export async function castVote(pollId: string, optionId: string): Promise<Result<PollResults>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await votePoll(supabase, pollId, optionId);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

"use server";

import { getSavedPolls, savePoll, unsavePoll } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { FeedPage, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Guarda o quita una encuesta con la cuenta con sesión (V2-022). Sin sesión no se llega a la base
// de datos; con ella, la RLS de saved_polls decide. Nunca se lanzan errores hacia la interfaz.
export async function saveAction(pollId: string, save: boolean): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await (save ? savePoll(supabase, pollId) : unsavePoll(supabase, pollId));
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

// Página siguiente de «Guardadas».
export async function loadMoreSaved(cursor: string): Promise<Result<FeedPage>> {
  try {
    return await getSavedPolls(await createClient(), cursor);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

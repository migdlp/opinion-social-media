"use server";

import { searchPolls } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { FeedPage, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Página siguiente de una búsqueda para «Cargar más» (SEARCH-002). La consulta y el cursor los valida
// la base de datos (INVALID_QUERY, INVALID_CURSOR; el cursor está ligado a la consulta) y quién puede
// ver qué lo decide Supabase; nunca se lanzan errores hacia la interfaz.
export async function loadMoreSearch(query: string, cursor: string): Promise<Result<FeedPage>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return await searchPolls(supabase, query, cursor, { signedIn: Boolean(data.user) });
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

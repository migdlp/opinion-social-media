"use server";

import { getFeed } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { FeedMode, FeedPage, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Página siguiente del feed para «Cargar más» (V2-032). El modo, la categoría y el cursor los
// valida la base de datos (INVALID_FEED_MODE, INVALID_CATEGORY, INVALID_CURSOR) y quién puede ver
// qué lo decide Supabase; nunca se lanzan errores hacia la interfaz.
export async function loadMoreFeed(
  mode: FeedMode,
  category: string | null,
  cursor: string,
): Promise<Result<FeedPage>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return await getFeed(supabase, { mode, category, cursor }, { signedIn: Boolean(data.user) });
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

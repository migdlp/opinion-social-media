"use server";

import { getFeedPage } from "@/lib/data/operations";
import type { FeedPage, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Página siguiente del feed para «Cargar más». Es una lectura pública: la RLS de
// Supabase decide qué filas se ven y el cursor ilegible sirve la primera página.
export async function loadMoreFeed(cursor: string): Promise<Result<FeedPage>> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return getFeedPage(supabase, cursor, { signedIn: Boolean(data.user) });
}

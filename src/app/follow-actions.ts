"use server";

import { followUser, getProfilePolls, getProfileVotes, unfollowUser } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { FeedPage, ProfileVote, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Acciones de servidor del perfil (V2-006). Seguir y dejar de seguir exigen sesión (sin ella no
// se llega a la base de datos); las lecturas paginadas las decide la RLS y las RPC de Supabase.
// Nunca se lanzan errores hacia la interfaz.
export async function followAction(username: string): Promise<Result<"accepted" | "pending">> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await followUser(supabase, username);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

export async function unfollowAction(username: string): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await unfollowUser(supabase, username);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

// Página siguiente de «Creadas».
export async function loadMoreProfilePolls(
  username: string,
  cursor: string,
): Promise<Result<FeedPage>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return await getProfilePolls(supabase, username, cursor, { signedIn: Boolean(data.user) });
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

// Página siguiente de «Votadas».
export async function loadMoreProfileVotes(
  username: string,
  cursor: string,
): Promise<Result<{ votes: ProfileVote[]; nextCursor: string | null }>> {
  try {
    const supabase = await createClient();
    return await getProfileVotes(supabase, username, cursor);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

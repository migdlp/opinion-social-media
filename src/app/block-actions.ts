"use server";

import { blockUser, listBlockedUsers, unblockUser } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { FollowPage, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Acciones de bloqueo (SOCIAL-002). Sin sesión no se llega a la base de datos; con ella,
// block_user / unblock_user / list_blocked_users imponen la autorización en Supabase. Nunca se
// lanzan errores hacia la interfaz.
export async function blockAction(username: string): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await blockUser(supabase, username);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

export async function unblockAction(username: string): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await unblockUser(supabase, username);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

export async function loadMoreBlocked(cursor: string): Promise<Result<FollowPage>> {
  try {
    return await listBlockedUsers(await createClient(), cursor);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

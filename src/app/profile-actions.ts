"use server";

import { upsertMyProfile } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { Profile, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Guarda el perfil de la cuenta con sesión (V2-002). Sin sesión no se llega a la base de datos;
// con ella, upsert_my_profile valida y comprueba la unicidad en Supabase. Nunca se lanzan
// errores hacia la interfaz.
export async function saveProfile(
  username: string,
  displayName: string | null,
): Promise<Result<Profile>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await upsertMyProfile(supabase, username, displayName);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

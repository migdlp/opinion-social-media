"use server";

import {
  setProfileAvatar,
  setProfilePrivacy,
  setVoteVisibility,
  upsertMyProfile,
} from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { AvatarIcon } from "@/lib/avatar-icons";
import type { Profile, Result, VoteVisibility } from "@/lib/data/types";
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

// Cambia la privacidad de la cuenta con sesión (V2-008). La base de datos decide; al pasar
// a pública acepta las solicitudes pendientes.
export async function savePrivacy(isPrivate: boolean): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await setProfilePrivacy(supabase, isPrivate);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

// Cambia quién puede ver las encuestas que vota la cuenta con sesión (PRIV-002). Es una
// preferencia independiente de la privacidad de la cuenta; la audiencia la impone la base de datos.
export async function saveVoteVisibility(visibility: VoteVisibility): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await setVoteVisibility(supabase, visibility);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

// Elige el icono de perfil de la cuenta con sesión, o vuelve a las iniciales con null
// (AVATAR-001). El catálogo y la autorización los impone la base de datos.
export async function saveAvatar(icon: AvatarIcon | null): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await setProfileAvatar(supabase, icon);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

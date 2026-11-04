"use server";

import { redirect } from "next/navigation";
import { toAppError } from "@/lib/data/errors";
import { deleteMyAccount } from "@/lib/data/operations";
import type { Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

const DELETED_PATH = "/?cuenta=eliminada";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// La cuenta ya no existe: se limpian las cookies de sesión (scope local: no hay nada que revocar en
// el servidor) y se vuelve al feed como visitante con el aviso. Si cerrar la sesión falla se
// redirige igualmente: la siguiente petición no encontrará usuario.
async function finish(supabase: Supabase): Promise<never> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Sin red: las cookies sobrantes dejan de valer porque el usuario ya no existe.
  }
  redirect(DELETED_PATH);
}

// Elimina la cuenta de la sesión (ACCOUNT-002, D-049). Sin sesión no se llega a la base de datos;
// con ella, delete_my_account valida la confirmación. Si funciona, cierra la sesión y redirige; si
// no, devuelve el error para mostrarlo en el diálogo. Nunca lanza errores hacia la interfaz.
export async function deleteAccountAction(confirm: string): Promise<Result<void>> {
  let supabase: Supabase;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    const result = await deleteMyAccount(supabase, confirm);
    if (!result.ok) return result;
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
  return finish(supabase);
}

// Tras un fallo de red no se sabe si el borrado llegó a hacerse. Se pregunta a Auth por el usuario
// de la sesión: «user_not_found» (el JWT sigue siendo válido, pero la cuenta ya no existe) se trata
// como un borrado con éxito. Cualquier otra respuesta, incluida una sesión caducada, no se
// confunde con un borrado y se devuelve como error de red.
export async function reconcileAccountDeletionAction(): Promise<Result<void>> {
  let supabase: Supabase;
  try {
    supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (data.user || error?.code !== "user_not_found") {
      return { ok: false, error: "NETWORK_ERROR" };
    }
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
  return finish(supabase);
}

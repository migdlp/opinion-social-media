"use server";

import { reportPoll, reportUser, type ReportReason } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Denuncia una encuesta con la cuenta con sesión. Sin sesión no se llega a la base de datos;
// con ella, report_poll valida, impone la cuota y evita duplicados en Supabase. Nunca se
// lanzan errores hacia la interfaz.
export async function submitReport(
  pollId: string,
  reason: ReportReason,
  details?: string,
): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await reportPoll(supabase, pollId, reason, details);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

// Denuncia a una persona por @usuario con la cuenta con sesión (MOD-002). Denunciar no bloquea ni
// oculta nada; lo revisa un moderador. Sin sesión no se llega a la base de datos.
export async function submitUserReport(
  username: string,
  reason: ReportReason,
  details?: string,
): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await reportUser(supabase, username, reason, details);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

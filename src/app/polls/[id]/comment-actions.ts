"use server";

import {
  addComment,
  listComments,
  reportComment,
  setPollComments,
  type ReportReason,
} from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { CommentPage, Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Acciones de servidor del debate (CMT-002). Quién puede leer, escribir, denunciar o cambiar el
// ajuste lo decide Supabase (voto previo, visibilidad, bloqueos, autoría); aquí sólo se exige
// sesión donde procede y nunca se lanzan errores hacia la interfaz.
async function withUser<T>(
  run: (supabase: Awaited<ReturnType<typeof createClient>>) => Promise<Result<T>>,
) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" } as const;
    return await run(supabase);
  } catch (error) {
    return { ok: false, error: toAppError(error) } as const;
  }
}

export async function postComment(pollId: string, body: string): Promise<Result<{ id: string }>> {
  return withUser((supabase) => addComment(supabase, pollId, body));
}

export async function toggleComments(pollId: string, enabled: boolean): Promise<Result<void>> {
  return withUser((supabase) => setPollComments(supabase, pollId, enabled));
}

export async function submitCommentReport(
  commentId: string,
  reason: ReportReason,
  details?: string,
): Promise<Result<void>> {
  return withUser((supabase) => reportComment(supabase, commentId, reason, details));
}

// Una cerrada pública se puede leer sin sesión; por eso aquí no se exige.
export async function loadMoreComments(
  pollId: string,
  cursor: string,
): Promise<Result<CommentPage>> {
  try {
    const supabase = await createClient();
    return await listComments(supabase, pollId, cursor);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

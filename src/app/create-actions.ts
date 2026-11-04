"use server";

import { createPoll, getFeedPage } from "@/lib/data/operations";
import { toAppError } from "@/lib/data/errors";
import type { Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

// Publica una encuesta del usuario con sesión. Sin sesión no se llega a la base de datos; con
// ella, create_poll valida los datos y aplica la cuota en Supabase. Nunca se lanzan errores
// hacia la interfaz.
export async function publishPoll(
  question: string,
  options: string[],
  closesAt?: string | null,
  category?: string | null,
  commentsEnabled?: boolean,
): Promise<Result<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    return await createPoll(supabase, question, options, closesAt, category, commentsEnabled);
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

const RECENT_MS = 15 * 60 * 1000;

// Tras una caída de red al publicar: ¿llegó a crearse la encuesta? Busca en el primer lote
// del feed una publicada hace poco con la misma pregunta y las mismas opciones, para no
// crear un duplicado al reintentar. null: no hay rastro de ella.
export async function findPublishedPoll(
  question: string,
  options: string[],
): Promise<Result<{ id: string } | null>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    const page = await getFeedPage(supabase, null, { signedIn: true });
    if (!page.ok) return page;
    const now = Date.now();
    const found = page.data.items.find(({ poll }) => {
      const recent = now - new Date(poll.createdAt).getTime() < RECENT_MS;
      const same =
        poll.question === question &&
        poll.options.length === options.length &&
        poll.options.every((option, i) => option.text === options[i]);
      return recent && same;
    });
    return { ok: true, data: found ? { id: found.poll.id } : null };
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

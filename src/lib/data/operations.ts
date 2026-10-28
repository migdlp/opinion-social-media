// Adaptadores de datos compartidos por la UI (docs/contratos-api.md §5). Todas las
// pantallas usan estas funciones: reciben el cliente Supabase del contexto
// (src/lib/supabase/server.ts o client.ts) y devuelven Result con AppErrorCode.
import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppError } from "./errors";
import { getFeedPolls, getOwnVoteOptionId, getPublicPoll } from "./polls";
import type {
  FeedPage,
  PollDetail,
  PollResults,
  PollViewerState,
  Profile,
  PublicPoll,
  Result,
} from "./types";

// signedIn lo decide quien llama a partir de la sesión; RLS sigue siendo la barrera.
export type Viewer = { signedIn: boolean };

type ResultRow = {
  option_id: string;
  position: number;
  text: string;
  votes: number;
  percentage: number;
  total_votes: number;
  my_option_id: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Convierte cualquier excepción (p. ej. fetch caído) en un Result controlado.
async function guard<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}

export function getPollResults(
  supabase: SupabaseClient,
  pollId: string,
): Promise<Result<PollResults>> {
  return guard(async () => {
    if (!UUID.test(pollId)) return { ok: false, error: "POLL_UNAVAILABLE" };

    const { data, error } = await supabase.rpc("get_poll_results", { p_poll_id: pollId });
    if (error) return { ok: false, error: toAppError(error) };

    const rows = (data ?? []) as ResultRow[];
    if (rows.length === 0) return { ok: false, error: "UNKNOWN" };
    return {
      ok: true,
      data: {
        pollId,
        totalVotes: rows[0].total_votes,
        myOptionId: rows[0].my_option_id,
        options: rows.map((r) => ({
          id: r.option_id,
          text: r.text,
          position: r.position,
          votes: r.votes,
          percentage: Number(r.percentage),
        })),
      },
    };
  });
}

export function votePoll(
  supabase: SupabaseClient,
  pollId: string,
  optionId: string,
): Promise<Result<PollResults>> {
  return guard(async () => {
    const { error } = await supabase
      .rpc("vote_poll", { p_poll_id: pollId, p_option_id: optionId })
      .single();
    // Un voto previo (otra pestaña, carrera o reintento) deja el mismo estado final: votado.
    if (error && toAppError(error) !== "ALREADY_VOTED")
      return { ok: false, error: toAppError(error) };
    return getPollResults(supabase, pollId);
  });
}

export function createPoll(
  supabase: SupabaseClient,
  question: string,
  options: string[],
  closesAt?: string | null,
): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("create_poll", {
      p_question: question,
      p_options: options,
      ...(closesAt ? { p_closes_at: closesAt } : {}),
    });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: { id: data as string } };
  });
}

export type ReportReason = "spam" | "odio" | "acoso" | "sexual" | "violencia" | "otro";

// Denuncia una encuesta (V2-020). La tabla de denuncias no es legible por clientes: sólo
// se informa de si se guardó.
export function reportPoll(
  supabase: SupabaseClient,
  pollId: string,
  reason: ReportReason,
  details?: string | null,
): Promise<Result<void>> {
  return guard(async () => {
    const { error } = await supabase.rpc("report_poll", {
      p_poll_id: pollId,
      p_reason: reason,
      p_details: details ?? null,
    });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: undefined };
  });
}

type ProfileRow = { username: string; display_name: string | null; is_private: boolean };

const toProfile = (row: ProfileRow): Profile => ({
  username: row.username,
  displayName: row.display_name,
  isPrivate: row.is_private,
});

// Perfil de la cuenta con sesión; null si aún no ha elegido @usuario (V2-002).
export function getMyProfile(supabase: SupabaseClient): Promise<Result<Profile | null>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("get_my_profile");
    if (error) return { ok: false, error: toAppError(error) };
    const row = ((data ?? []) as ProfileRow[])[0];
    return { ok: true, data: row ? toProfile(row) : null };
  });
}

// Crea o edita el perfil propio. Errores: USERNAME_INVALID/TAKEN/RESERVED, DISPLAY_NAME_INVALID.
export function upsertMyProfile(
  supabase: SupabaseClient,
  username: string,
  displayName: string | null,
): Promise<Result<Profile>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("upsert_my_profile", {
      p_username: username,
      p_display_name: displayName,
    });
    if (error) return { ok: false, error: toAppError(error) };
    const row = ((data ?? []) as ProfileRow[])[0];
    return row ? { ok: true, data: toProfile(row) } : { ok: false, error: "UNKNOWN" };
  });
}

// Pasa la cuenta a privada o pública. Al volver a pública, la base de datos acepta las
// solicitudes de seguimiento pendientes. Errores: AUTH_REQUIRED, PROFILE_REQUIRED.
export function setProfilePrivacy(
  supabase: SupabaseClient,
  isPrivate: boolean,
): Promise<Result<null>> {
  return guard(async () => {
    const { error } = await supabase.rpc("set_profile_privacy", { p_private: isPrivate });
    return error ? { ok: false, error: toAppError(error) } : { ok: true, data: null };
  });
}

async function viewerFor(
  supabase: SupabaseClient,
  pollId: string,
  ownOptionId: string | null,
): Promise<Result<PollViewerState>> {
  if (!ownOptionId) return { ok: true, data: { kind: "not_voted" } };
  const results = await getPollResults(supabase, pollId);
  return results.ok ? { ok: true, data: { kind: "voted", results: results.data } } : results;
}

export function getPollDetail(
  supabase: SupabaseClient,
  id: string,
  viewer: Viewer,
): Promise<Result<PollDetail>> {
  return guard(async () => {
    const poll = await getPublicPoll(supabase, id);
    if (!poll.ok) return poll;
    if (!viewer.signedIn)
      return { ok: true, data: { poll: poll.data, viewer: { kind: "anonymous" } } };

    const own = await getOwnVoteOptionId(supabase, id);
    if (!own.ok) {
      // Sesión caducada o ausente: se muestra como visitante y la UI ofrecerá iniciar sesión.
      if (own.error === "AUTH_REQUIRED")
        return { ok: true, data: { poll: poll.data, viewer: { kind: "anonymous" } } };
      return own;
    }
    const state = await viewerFor(supabase, id, own.data);
    return state.ok ? { ok: true, data: { poll: poll.data, viewer: state.data } } : state;
  });
}

function anonymousPage(polls: PublicPoll[], nextCursor: string | null): Result<FeedPage> {
  return {
    ok: true,
    data: { items: polls.map((poll) => ({ poll, viewer: { kind: "anonymous" } })), nextCursor },
  };
}

export function getFeedPage(
  supabase: SupabaseClient,
  cursor: string | null | undefined,
  viewer: Viewer,
): Promise<Result<FeedPage>> {
  return guard(async () => {
    const page = await getFeedPolls(supabase, cursor);
    if (!page.ok) return page;
    const { polls, nextCursor } = page.data;

    if (!viewer.signedIn || polls.length === 0) {
      return anonymousPage(polls, nextCursor);
    }

    // Una consulta de votos propios para todo el lote (RLS sólo devuelve los del usuario).
    const { data, error } = await supabase
      .from("votes")
      .select("poll_id, option_id")
      .in(
        "poll_id",
        polls.map((p) => p.id),
      );
    if (error) {
      if (toAppError(error) === "AUTH_REQUIRED") {
        return anonymousPage(polls, nextCursor);
      }
      return { ok: false, error: toAppError(error) };
    }
    const own = new Map(
      (data as { poll_id: string; option_id: string }[]).map((v) => [v.poll_id, v.option_id]),
    );

    const states = await Promise.all(
      polls.map((p) => viewerFor(supabase, p.id, own.get(p.id) ?? null)),
    );
    const items = [];
    for (let i = 0; i < polls.length; i++) {
      const state = states[i];
      if (!state.ok) return state;
      items.push({ poll: polls[i], viewer: state.data });
    }
    return { ok: true, data: { items, nextCursor } };
  });
}

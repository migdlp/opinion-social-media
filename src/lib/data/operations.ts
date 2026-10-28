// Adaptadores de datos compartidos por la UI (docs/contratos-api.md §5). Todas las
// pantallas usan estas funciones: reciben el cliente Supabase del contexto
// (src/lib/supabase/server.ts o client.ts) y devuelven Result con AppErrorCode.
import type { SupabaseClient } from "@supabase/supabase-js";
import { isClosed } from "@/lib/utils/date";
import { toAppError } from "./errors";
import { getFeedPolls, getOwnVoteOptionId, getPublicPoll, getPublicPollsByIds } from "./polls";
import type {
  Category,
  FeedPage,
  FollowPage,
  PollDetail,
  PollResults,
  PollViewerState,
  Profile,
  ProfileView,
  ProfileVote,
  PublicPoll,
  Result,
  ViewerRelation,
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
  category?: string | null,
): Promise<Result<{ id: string }>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("create_poll", {
      p_question: question,
      p_options: options,
      ...(closesAt ? { p_closes_at: closesAt } : {}),
      ...(category ? { p_category: category } : {}),
    });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: { id: data as string } };
  });
}

// Lista cerrada de categorías, en el orden de la base de datos (V2-021).
export function getCategories(supabase: SupabaseClient): Promise<Result<Category[]>> {
  return guard(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("slug, name")
      .order("position", { ascending: true });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: (data ?? []) as Category[] };
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

type ProfileVoteRow = {
  poll_id: string;
  question: string;
  poll_created_at: string;
  closes_at: string | null;
  author_username: string | null;
  author_display_name: string | null;
  voted_at: string;
  option_id: string | null;
  option_text: string | null;
  choice_hidden: boolean;
  cursor: string;
};

export const PROFILE_VOTES_PAGE_SIZE = 20;

// Votos visibles en el perfil de @username (V2-007). Errores: USER_NOT_FOUND, PROFILE_PRIVATE.
// La RPC devuelve hasta 21 filas (20 + 1 para saber si hay más).
export function getProfileVotes(
  supabase: SupabaseClient,
  username: string,
  cursor?: string | null,
): Promise<Result<{ votes: ProfileVote[]; nextCursor: string | null }>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("get_profile_votes", {
      p_username: username,
      p_cursor: cursor ?? null,
    });
    if (error) return { ok: false, error: toAppError(error) };
    const rows = (data ?? []) as ProfileVoteRow[];
    const page = rows.slice(0, PROFILE_VOTES_PAGE_SIZE);
    return {
      ok: true,
      data: {
        votes: page.map((row) => ({
          pollId: row.poll_id,
          question: row.question,
          pollCreatedAt: row.poll_created_at,
          closesAt: row.closes_at,
          author: row.author_username
            ? { username: row.author_username, displayName: row.author_display_name }
            : null,
          votedAt: row.voted_at,
          choice:
            !row.choice_hidden && row.option_id && row.option_text
              ? { optionId: row.option_id, text: row.option_text }
              : null,
        })),
        nextCursor: rows.length > PROFILE_VOTES_PAGE_SIZE ? page[page.length - 1].cursor : null,
      },
    };
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

// Encuesta cerrada (D-020): sus resultados son públicos. Se piden con o sin sesión; quien votó
// (myOptionId) los ve como «voted» y el resto como «closed». El reloj es el de la aplicación: si
// la base de datos aún la considera abierta (desfase), devuelve null y se sigue el flujo normal.
async function closedViewer(
  supabase: SupabaseClient,
  poll: PublicPoll,
  signedIn: boolean,
): Promise<Result<PollViewerState | null>> {
  if (!isClosed(poll.closesAt, new Date())) return { ok: true, data: null };
  const results = await getPollResults(supabase, poll.id);
  if (results.ok) {
    return {
      ok: true,
      data: results.data.myOptionId
        ? { kind: "voted", results: results.data }
        : { kind: "closed", results: results.data, signedIn },
    };
  }
  if (results.error === "AUTH_REQUIRED" || results.error === "NOT_VOTED")
    return { ok: true, data: null };
  return results;
}

// Sólo los datos públicos de la encuesta (sin estado de voto ni resultados, aunque esté cerrada):
// para metadatos y vista previa social, que nunca deben incluir cifras.
export function getPollSummary(supabase: SupabaseClient, id: string): Promise<Result<PublicPoll>> {
  return guard(() => getPublicPoll(supabase, id));
}

export function getPollDetail(
  supabase: SupabaseClient,
  id: string,
  viewer: Viewer,
): Promise<Result<PollDetail>> {
  return guard(async () => {
    const poll = await getPublicPoll(supabase, id);
    if (!poll.ok) return poll;
    const closed = await closedViewer(supabase, poll.data, viewer.signedIn);
    if (!closed.ok) return closed;
    if (closed.data) return { ok: true, data: { poll: poll.data, viewer: closed.data } };
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

type FeedResultRow = ResultRow & { poll_id: string };

// Resultados de un lote (≤ 20 encuestas) con UNA llamada (V2-023). La base de datos aplica a cada
// encuesta la misma autorización que get_poll_results y omite las no autorizadas sin error.
async function getFeedResults(
  supabase: SupabaseClient,
  pollIds: string[],
): Promise<Result<Map<string, PollResults>>> {
  const byPoll = new Map<string, PollResults>();
  if (pollIds.length === 0) return { ok: true, data: byPoll };
  const { data, error } = await supabase.rpc("get_feed_results", { p_poll_ids: pollIds });
  if (error) return { ok: false, error: toAppError(error) };
  for (const row of (data ?? []) as FeedResultRow[]) {
    let results = byPoll.get(row.poll_id);
    if (!results) {
      results = {
        pollId: row.poll_id,
        totalVotes: row.total_votes,
        myOptionId: row.my_option_id,
        options: [],
      };
      byPoll.set(row.poll_id, results);
    }
    results.options.push({
      id: row.option_id,
      text: row.text,
      position: row.position,
      votes: row.votes,
      percentage: Number(row.percentage),
    });
  }
  return { ok: true, data: byPoll };
}

// Estado de cada encuesta de una página para quien mira. Los resultados (de las votadas y de las
// cerradas, D-020) llegan con una única consulta por lote; el resto sigue sin cifras.
async function withViewerStates(
  supabase: SupabaseClient,
  polls: PublicPoll[],
  nextCursor: string | null,
  own: Map<string, string>,
  signedIn: boolean,
): Promise<Result<FeedPage>> {
  const now = new Date();
  const wanted = polls.filter((p) => isClosed(p.closesAt, now) || own.has(p.id)).map((p) => p.id);
  const results = await getFeedResults(supabase, wanted);
  if (!results.ok) return results;

  const items = polls.map((poll) => {
    const found = results.data.get(poll.id);
    const viewer: PollViewerState = found
      ? found.myOptionId
        ? { kind: "voted", results: found }
        : { kind: "closed", results: found, signedIn }
      : signedIn
        ? { kind: "not_voted" }
        : { kind: "anonymous" };
    return { poll, viewer };
  });
  return { ok: true, data: { items, nextCursor } };
}

export function getFeedPage(
  supabase: SupabaseClient,
  cursor: string | null | undefined,
  viewer: Viewer,
): Promise<Result<FeedPage>> {
  return guard(async () => {
    const page = await getFeedPolls(supabase, cursor);
    if (!page.ok) return page;
    return withOwnVotes(supabase, page.data.polls, page.data.nextCursor, viewer);
  });
}

// Voto propio de cada encuesta de la página (una sola consulta; RLS sólo devuelve los del usuario)
// y estado de cada una para quien mira.
async function withOwnVotes(
  supabase: SupabaseClient,
  polls: PublicPoll[],
  nextCursor: string | null,
  viewer: Viewer,
): Promise<Result<FeedPage>> {
  if (!viewer.signedIn || polls.length === 0) {
    return withViewerStates(supabase, polls, nextCursor, new Map(), false);
  }

  const { data, error } = await supabase
    .from("votes")
    .select("poll_id, option_id")
    .in(
      "poll_id",
      polls.map((p) => p.id),
    );
  if (error) {
    if (toAppError(error) === "AUTH_REQUIRED") {
      return withViewerStates(supabase, polls, nextCursor, new Map(), false);
    }
    return { ok: false, error: toAppError(error) };
  }
  const own = new Map(
    (data as { poll_id: string; option_id: string }[]).map((v) => [v.poll_id, v.option_id]),
  );
  return withViewerStates(supabase, polls, nextCursor, own, true);
}

type ProfileViewRow = {
  username: string;
  display_name: string | null;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  polls_count: number;
  viewer_relation: ViewerRelation;
  can_view_content: boolean;
};

// Cabecera de un perfil (V2-006). Errores: USER_NOT_FOUND.
export function getProfileView(
  supabase: SupabaseClient,
  username: string,
): Promise<Result<ProfileView>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("get_profile", { p_username: username });
    if (error) return { ok: false, error: toAppError(error) };
    const row = ((data ?? []) as ProfileViewRow[])[0];
    if (!row) return { ok: false, error: "USER_NOT_FOUND" };
    return {
      ok: true,
      data: {
        username: row.username,
        displayName: row.display_name,
        isPrivate: row.is_private,
        followersCount: row.followers_count,
        followingCount: row.following_count,
        pollsCount: row.polls_count,
        viewerRelation: row.viewer_relation,
        canViewContent: row.can_view_content,
      },
    };
  });
}

export const PROFILE_POLLS_PAGE_SIZE = 20;

// Encuestas creadas por @username que quien mira puede ver, con el mismo formato y estado de
// voto que el feed (V2-006). Errores: USER_NOT_FOUND, PROFILE_PRIVATE.
export function getProfilePolls(
  supabase: SupabaseClient,
  username: string,
  cursor: string | null | undefined,
  viewer: Viewer,
): Promise<Result<FeedPage>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("get_profile_polls", {
      p_username: username,
      p_cursor: cursor ?? null,
    });
    if (error) return { ok: false, error: toAppError(error) };
    const rows = (data ?? []) as { poll_id: string; cursor: string }[];
    const page = rows.slice(0, PROFILE_POLLS_PAGE_SIZE);
    if (page.length === 0) return { ok: true, data: { items: [], nextCursor: null } };
    const nextCursor = rows.length > PROFILE_POLLS_PAGE_SIZE ? page[page.length - 1].cursor : null;

    const polls = await getPublicPollsByIds(
      supabase,
      page.map((row) => row.poll_id),
    );
    if (!polls.ok) return polls;
    return withOwnVotes(supabase, polls.data, nextCursor, viewer);
  });
}

// Sigue (o pide seguir) a @username: «accepted» si la cuenta es pública, «pending» si es privada.
export function followUser(
  supabase: SupabaseClient,
  username: string,
): Promise<Result<"accepted" | "pending">> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("follow_user", { p_username: username });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: data === "pending" ? "pending" : "accepted" };
  });
}

// Deja de seguir o cancela la solicitud pendiente. Idempotente.
export function unfollowUser(supabase: SupabaseClient, username: string): Promise<Result<void>> {
  return guard(async () => {
    const { error } = await supabase.rpc("unfollow_user", { p_username: username });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: undefined };
  });
}

export const FOLLOW_PAGE_SIZE = 30;

type FollowRow = { username: string; display_name: string | null; cursor: string };

// Páginas de 30 (V2-009): la RPC devuelve una fila más para saber si hay página siguiente.
function toFollowPage(data: unknown): FollowPage {
  const rows = (data ?? []) as FollowRow[];
  const page = rows.slice(0, FOLLOW_PAGE_SIZE);
  return {
    users: page.map((row) => ({ username: row.username, displayName: row.display_name })),
    nextCursor: rows.length > FOLLOW_PAGE_SIZE ? page[page.length - 1].cursor : null,
  };
}

// Seguidores aceptados de @username. Errores: USER_NOT_FOUND, PROFILE_PRIVATE.
export function listFollowers(
  supabase: SupabaseClient,
  username: string,
  cursor?: string | null,
): Promise<Result<FollowPage>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("list_followers", {
      p_username: username,
      p_cursor: cursor ?? null,
    });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: toFollowPage(data) };
  });
}

// Cuentas que sigue @username (relaciones aceptadas). Errores: USER_NOT_FOUND, PROFILE_PRIVATE.
export function listFollowing(
  supabase: SupabaseClient,
  username: string,
  cursor?: string | null,
): Promise<Result<FollowPage>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("list_following", {
      p_username: username,
      p_cursor: cursor ?? null,
    });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: toFollowPage(data) };
  });
}

// Solicitudes pendientes recibidas por la cuenta con sesión. Sin sesión: AUTH_REQUIRED.
export function listFollowRequests(
  supabase: SupabaseClient,
  cursor?: string | null,
): Promise<Result<FollowPage>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("list_follow_requests", {
      p_cursor: cursor ?? null,
    });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: toFollowPage(data) };
  });
}

export function countFollowRequests(supabase: SupabaseClient): Promise<Result<number>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("count_follow_requests");
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: Number(data ?? 0) };
  });
}

// Acepta o rechaza la solicitud pendiente de @username. Sin solicitud: USER_NOT_FOUND.
export function respondFollowRequest(
  supabase: SupabaseClient,
  username: string,
  accept: boolean,
): Promise<Result<void>> {
  return guard(async () => {
    const { error } = await supabase.rpc("respond_follow_request", {
      p_username: username,
      p_accept: accept,
    });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: undefined };
  });
}

// Elimina a @username de los seguidores propios. Idempotente.
export function removeFollower(supabase: SupabaseClient, username: string): Promise<Result<void>> {
  return guard(async () => {
    const { error } = await supabase.rpc("remove_follower", { p_username: username });
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: undefined };
  });
}

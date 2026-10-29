// Adaptadores de datos compartidos por la UI (docs/contratos-api.md §5). Todas las
// pantallas usan estas funciones: reciben el cliente Supabase del contexto
// (src/lib/supabase/server.ts o client.ts) y devuelven Result con AppErrorCode.
import type { SupabaseClient } from "@supabase/supabase-js";
import { isClosed } from "@/lib/utils/date";
import { toAppError } from "./errors";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  FEED_PAGE_SIZE,
  getFeedPolls,
  getOwnVoteOptionId,
  getPublicPoll,
  getPublicPollsByIds,
} from "./polls";
import type {
  AppErrorCode,
  Category,
  FeedPage,
  FeedQuery,
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
  VoteVisibility,
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

// Votos visibles en el perfil de @username. Errores: USER_NOT_FOUND, PROFILE_PRIVATE, VOTES_PRIVATE.
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
  return guard<PollDetail>(async () => {
    const poll = await getPublicPoll(supabase, id);
    if (!poll.ok) return poll;
    const closed = await closedViewer(supabase, poll.data, viewer.signedIn);
    if (!closed.ok) return closed;
    if (closed.data) {
      const saved = viewer.signedIn ? await isSaved(supabase, id) : undefined;
      return { ok: true, data: { poll: poll.data, viewer: closed.data, saved } };
    }
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
    if (!state.ok) return state;
    const saved = await isSaved(supabase, id);
    return { ok: true, data: { poll: poll.data, viewer: state.data, saved } };
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
  const page = { items, nextCursor };
  return { ok: true, data: signedIn ? await markSaved(supabase, page) : page };
}

// Marca cuáles de las encuestas de la página tiene guardadas la cuenta (V2-022) con UNA consulta.
// Es un adorno: si falla, la página se entrega sin el marcador en lugar de fallar entera.
async function markSaved(supabase: SupabaseClient, page: FeedPage): Promise<FeedPage> {
  if (page.items.length === 0) return page;
  try {
    const { data, error } = await supabase
      .from("saved_polls")
      .select("poll_id")
      .in(
        "poll_id",
        page.items.map((item) => item.poll.id),
      );
    if (error) return page;
    const saved = new Set(((data ?? []) as { poll_id: string }[]).map((row) => row.poll_id));
    return {
      ...page,
      items: page.items.map((item) => ({ ...item, saved: saved.has(item.poll.id) })),
    };
  } catch {
    return page;
  }
}

async function isSaved(supabase: SupabaseClient, pollId: string): Promise<boolean | undefined> {
  try {
    const { data, error } = await supabase
      .from("saved_polls")
      .select("poll_id")
      .in("poll_id", [pollId]);
    if (error) return undefined;
    return ((data ?? []) as unknown[]).length > 0;
  } catch {
    return undefined;
  }
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
type OwnVotes =
  { ok: true; own: Map<string, string>; signedIn: boolean } | { ok: false; error: AppErrorCode };

// Votos propios de las encuestas dadas (la RLS sólo devuelve los de quien llama). Sin sesión válida
// (AUTH_REQUIRED) se trata como visitante.
async function fetchOwnVotes(supabase: SupabaseClient, pollIds: string[]): Promise<OwnVotes> {
  const { data, error } = await supabase
    .from("votes")
    .select("poll_id, option_id")
    .in("poll_id", pollIds);
  if (error) {
    if (toAppError(error) === "AUTH_REQUIRED") return { ok: true, own: new Map(), signedIn: false };
    return { ok: false, error: toAppError(error) };
  }
  const own = new Map(
    (data as { poll_id: string; option_id: string }[]).map((v) => [v.poll_id, v.option_id]),
  );
  return { ok: true, own, signedIn: true };
}

// `preloaded` permite haber lanzado la lectura de votos a la vez que la de las encuestas (PERF-001).
async function withOwnVotes(
  supabase: SupabaseClient,
  polls: PublicPoll[],
  nextCursor: string | null,
  viewer: Viewer,
  preloaded?: OwnVotes,
): Promise<Result<FeedPage>> {
  if (!viewer.signedIn || polls.length === 0) {
    return withViewerStates(supabase, polls, nextCursor, new Map(), false);
  }
  const votes =
    preloaded ??
    (await fetchOwnVotes(
      supabase,
      polls.map((p) => p.id),
    ));
  if (!votes.ok) return { ok: false, error: votes.error };
  return withViewerStates(supabase, polls, nextCursor, votes.own, votes.signedIn);
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

    // Encuestas y votos propios dependen sólo de los ids: se piden a la vez (PERF-001).
    const ids = page.map((row) => row.poll_id);
    const [polls, votes] = await Promise.all([
      getPublicPollsByIds(supabase, ids),
      viewer.signedIn ? fetchOwnVotes(supabase, ids) : Promise.resolve(undefined),
    ]);
    if (!polls.ok) return polls;
    return withOwnVotes(supabase, polls.data, nextCursor, viewer, votes);
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

// Guarda la encuesta para volver a ella (V2-022). Idempotente: guardar dos veces no duplica. Sólo
// se guarda lo que la cuenta puede ver: la RLS lo impone y una violación se informa como
// POLL_UNAVAILABLE, igual que una encuesta inexistente. La sesión la comprueba quien llama.
export function savePoll(supabase: SupabaseClient, pollId: string): Promise<Result<void>> {
  return guard(async () => {
    if (!UUID.test(pollId)) return { ok: false, error: "POLL_UNAVAILABLE" };
    const { error } = await supabase
      .from("saved_polls")
      .upsert({ poll_id: pollId }, { onConflict: "user_id,poll_id", ignoreDuplicates: true });
    if (error) {
      if (error.code === "42501" && /row-level security/i.test(error.message))
        return { ok: false, error: "POLL_UNAVAILABLE" };
      return { ok: false, error: toAppError(error) };
    }
    return { ok: true, data: undefined };
  });
}

// Quita la encuesta de las guardadas. Idempotente.
export function unsavePoll(supabase: SupabaseClient, pollId: string): Promise<Result<void>> {
  return guard(async () => {
    if (!UUID.test(pollId)) return { ok: true, data: undefined };
    const { error } = await supabase.from("saved_polls").delete().eq("poll_id", pollId);
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, data: undefined };
  });
}

// Pestaña «Guardadas» del perfil propio (V2-022): las más recientemente guardadas primero, con el
// estado de voto de cada una. La RLS de polls oculta las que ya no se pueden ver (ocultas o de una
// cuenta privada a la que no se sigue). Cursor por (fecha de guardado, encuesta).
export function getSavedPolls(
  supabase: SupabaseClient,
  cursor?: string | null,
): Promise<Result<FeedPage>> {
  return guard(async () => {
    let query = supabase
      .from("saved_polls")
      .select("poll_id, created_at, polls!inner(id)")
      .order("created_at", { ascending: false })
      .order("poll_id", { ascending: false })
      .limit(FEED_PAGE_SIZE + 1);
    const after = decodeFeedCursor(cursor);
    if (after) {
      query = query.or(
        `created_at.lt."${after.createdAt}",and(created_at.eq."${after.createdAt}",poll_id.lt.${after.id})`,
      );
    }
    const { data, error } = await query;
    if (error) return { ok: false, error: toAppError(error) };

    const rows = (data ?? []) as unknown as { poll_id: string; created_at: string }[];
    const page = rows.slice(0, FEED_PAGE_SIZE);
    if (page.length === 0) return { ok: true, data: { items: [], nextCursor: null } };
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > FEED_PAGE_SIZE
        ? encodeFeedCursor({ createdAt: last.created_at, id: last.poll_id })
        : null;

    const polls = await getPublicPollsByIds(
      supabase,
      page.map((row) => row.poll_id),
    );
    if (!polls.ok) return polls;
    const withVotes = await withOwnVotes(supabase, polls.data, nextCursor, { signedIn: true });
    if (!withVotes.ok) return withVotes;
    return {
      ok: true,
      data: {
        ...withVotes.data,
        items: withVotes.data.items.map((item) => ({ ...item, saved: true })),
      },
    };
  });
}

// Feed por modos y categoría (V2-031, D-022 a D-025). La RPC decide qué ids ve quien pregunta
// (visibilidad, relación aceptada, categoría, retención de 24 h tras el cierre) y devuelve sólo ids y
// cursor; las encuestas salen por la RLS y los resultados por la misma ruta autorizada que el resto
// de listas. Errores controlados: INVALID_FEED_MODE, INVALID_CATEGORY, INVALID_CURSOR y, para
// «siguiendo» sin sesión, AUTH_REQUIRED.
export function getFeed(
  supabase: SupabaseClient,
  query: FeedQuery,
  viewer: Viewer,
): Promise<Result<FeedPage>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("get_feed", {
      p_mode: query.mode,
      p_category: query.category ?? null,
      p_cursor: query.cursor ?? null,
    });
    if (error) return { ok: false, error: toAppError(error) };
    const rows = (data ?? []) as { poll_id: string; cursor: string }[];
    const page = rows.slice(0, FEED_PAGE_SIZE);
    if (page.length === 0) return { ok: true, data: { items: [], nextCursor: null } };
    const nextCursor = rows.length > FEED_PAGE_SIZE ? page[page.length - 1].cursor : null;

    // Encuestas y votos propios dependen sólo de los ids: se piden a la vez (PERF-001).
    const ids = page.map((row) => row.poll_id);
    const [polls, votes] = await Promise.all([
      getPublicPollsByIds(supabase, ids),
      viewer.signedIn ? fetchOwnVotes(supabase, ids) : Promise.resolve(undefined),
    ]);
    if (!polls.ok) return polls;
    return withOwnVotes(supabase, polls.data, nextCursor, viewer, votes);
  });
}

// ¿Sigue la cuenta a alguien con relación ACEPTADA? Decide la pestaña por defecto del feed (D-022):
// las solicitudes pendientes no cuentan. Un fallo se trata como «no» para no romper la página.
export async function hasAcceptedFollows(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", userId)
      .eq("status", "accepted")
      .limit(1);
    return !error && ((data ?? []) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

// Sólo preferencias propias: las RPC no aceptan un usuario objetivo.
export function getMyVoteVisibility(supabase: SupabaseClient): Promise<Result<VoteVisibility>> {
  return guard(async () => {
    const { data, error } = await supabase.rpc("get_my_vote_visibility");
    if (error) return { ok: false, error: toAppError(error) };
    return data === "private" || data === "followers" || data === "profile"
      ? { ok: true, data }
      : { ok: false, error: "UNKNOWN" };
  });
}

export function setVoteVisibility(
  supabase: SupabaseClient,
  visibility: VoteVisibility,
): Promise<Result<void>> {
  return guard(async () => {
    const { error } = await supabase.rpc("set_vote_visibility", { p_visibility: visibility });
    return error ? { ok: false, error: toAppError(error) } : { ok: true, data: undefined };
  });
}

// Lecturas públicas de encuestas (docs/contratos-api.md §4). RLS limita las filas
// a encuestas publicadas; aquí se fijan columnas, orden y paginación. Nunca se
// pide polls.user_id ni nada de votos ajenos.
import type { SupabaseClient } from "@supabase/supabase-js";
import { toAppError } from "./errors";
import type { Category, PollAuthor, PollOption, PublicPoll, Result } from "./types";

export const FEED_PAGE_SIZE = 20;

const PUBLIC_POLL_COLUMNS =
  "id, question, created_at, closes_at, category:categories(slug, name), poll_options(id, text, position)";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Formato en que PostgREST serializa timestamptz; sin comas, comillas ni paréntesis.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:\d{2}|Z)$/;

export type FeedCursor = { createdAt: string; id: string };

type PollRow = {
  id: string;
  question: string;
  created_at: string;
  closes_at: string | null;
  category: Category | null;
  poll_options: PollOption[];
};

// base64url de JSON con btoa/atob (navegador y servidor); el contenido es ASCII.
export function encodeFeedCursor(cursor: FeedCursor): string {
  const base64 = btoa(JSON.stringify({ c: cursor.createdAt, i: cursor.id }));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeFeedCursor(value: string | null | undefined): FeedCursor | null {
  if (!value) return null;
  try {
    const { c, i } = JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof c !== "string" || typeof i !== "string" || !TIMESTAMP.test(c) || !UUID.test(i))
      return null;
    return { createdAt: c, id: i };
  } catch {
    return null;
  }
}

type AuthorRow = { poll_id: string; username: string; display_name: string | null };

// Autores de un lote de encuestas con una sola RPC (los clientes no leen polls.user_id).
// Las encuestas cuyo autor no tiene perfil no aparecen: se muestran como «Anónimo».
async function getAuthors(
  supabase: SupabaseClient,
  pollIds: string[],
): Promise<Result<Map<string, PollAuthor>>> {
  const authors = new Map<string, PollAuthor>();
  if (pollIds.length === 0) return { ok: true, data: authors };
  const { data, error } = await supabase.rpc("get_poll_authors", { p_poll_ids: pollIds });
  if (error) return { ok: false, error: toAppError(error) };
  for (const row of (data ?? []) as AuthorRow[]) {
    authors.set(row.poll_id, { username: row.username, displayName: row.display_name });
  }
  return { ok: true, data: authors };
}

function toPublicPoll(row: PollRow, author: PollAuthor | null): PublicPoll {
  return {
    id: row.id,
    question: row.question,
    createdAt: row.created_at,
    closesAt: row.closes_at,
    category: row.category ?? null,
    author,
    options: [...row.poll_options].sort((a, b) => a.position - b.position),
  };
}

export async function getFeedPolls(
  supabase: SupabaseClient,
  cursor?: string | null,
): Promise<Result<{ polls: PublicPoll[]; nextCursor: string | null }>> {
  let query = supabase
    .from("polls")
    .select(PUBLIC_POLL_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("position", { referencedTable: "poll_options", ascending: true })
    .limit(FEED_PAGE_SIZE + 1);

  const after = decodeFeedCursor(cursor);
  if (after) {
    // Comillas porque la fecha contiene ':' y '.', reservados en los filtros or().
    query = query.or(
      `created_at.lt."${after.createdAt}",and(created_at.eq."${after.createdAt}",id.lt.${after.id})`,
    );
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: toAppError(error) };

  const rows = (data ?? []) as unknown as PollRow[];
  const page = rows.slice(0, FEED_PAGE_SIZE);
  const last = page[page.length - 1];
  const nextCursor =
    rows.length > FEED_PAGE_SIZE && last
      ? encodeFeedCursor({ createdAt: last.created_at, id: last.id })
      : null;

  const authors = await getAuthors(
    supabase,
    page.map((row) => row.id),
  );
  if (!authors.ok) return authors;

  return {
    ok: true,
    data: {
      polls: page.map((row) => toPublicPoll(row, authors.data.get(row.id) ?? null)),
      nextCursor,
    },
  };
}

export async function getPublicPoll(
  supabase: SupabaseClient,
  id: string,
): Promise<Result<PublicPoll>> {
  // Un ID mal formado no se consulta: PostgREST respondería 22P02 y delataría el formato.
  if (!UUID.test(id)) return { ok: false, error: "POLL_UNAVAILABLE" };

  const { data, error } = await supabase
    .from("polls")
    .select(PUBLIC_POLL_COLUMNS)
    .eq("id", id)
    .order("position", { referencedTable: "poll_options", ascending: true })
    .maybeSingle();
  if (error) return { ok: false, error: toAppError(error) };
  // Inexistente y oculta son indistinguibles: RLS no devuelve la fila.
  if (!data) return { ok: false, error: "POLL_UNAVAILABLE" };

  const row = data as unknown as PollRow;
  const authors = await getAuthors(supabase, [row.id]);
  if (!authors.ok) return authors;

  return { ok: true, data: toPublicPoll(row, authors.data.get(row.id) ?? null) };
}

// Sólo con sesión: anon no tiene acceso a votes (MVP-012) y recibe AUTH_REQUIRED.
export async function getOwnVoteOptionId(
  supabase: SupabaseClient,
  pollId: string,
): Promise<Result<string | null>> {
  if (!UUID.test(pollId)) return { ok: true, data: null };

  const { data, error } = await supabase
    .from("votes")
    .select("option_id")
    .eq("poll_id", pollId)
    .maybeSingle();
  if (error) return { ok: false, error: toAppError(error) };

  return { ok: true, data: (data as { option_id: string } | null)?.option_id ?? null };
}

// Tipos del dominio definidos en docs/contratos-api.md §5 (MVP-013).
import type { AvatarIcon } from "@/lib/avatar-icons";

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "VALIDATION_QUESTION_LENGTH"
  | "VALIDATION_OPTION_COUNT"
  | "VALIDATION_OPTION_LENGTH"
  | "VALIDATION_OPTION_DUPLICATE"
  | "RATE_LIMITED"
  | "POLL_UNAVAILABLE"
  | "OPTION_INVALID"
  | "ALREADY_VOTED"
  | "NOT_VOTED"
  | "ALREADY_REPORTED"
  | "REPORT_RATE_LIMITED"
  | "REPORT_INVALID"
  | "INVALID_CLOSES_AT"
  | "POLL_CLOSED"
  | "INVALID_CATEGORY"
  | "INVALID_CURSOR"
  | "INVALID_QUERY"
  | "COMMENTS_DISABLED"
  | "VOTE_REQUIRED"
  | "COMMENT_INVALID"
  | "INVALID_FEED_MODE"
  | "USERNAME_INVALID"
  | "USERNAME_TAKEN"
  | "USERNAME_RESERVED"
  | "DISPLAY_NAME_INVALID"
  | "PROFILE_REQUIRED"
  | "USER_NOT_FOUND"
  | "PROFILE_PRIVATE"
  | "VOTES_PRIVATE"
  | "VOTE_VISIBILITY_INVALID"
  | "AVATAR_INVALID"
  | "BIO_INVALID"
  | "CANNOT_FOLLOW_SELF"
  | "CANNOT_BLOCK_SELF"
  | "FOLLOW_RATE_LIMITED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorCode };

export interface PollOption {
  id: string;
  text: string;
  position: number;
}

// Perfil propio (V2-001). Nunca incluye user_id.
export interface Profile {
  username: string;
  displayName: string | null;
  isPrivate: boolean;
  // Icono elegido (AVATAR-001); ausente = iniciales.
  avatarIcon?: AvatarIcon | null;
  // Biografía propia (PROFILE-001); ausente = sin bio.
  bio?: string;
}

// Autor con perfil (V2-003). Sin perfil, PublicPoll.author es null y se muestra «Anónimo».
export interface PollAuthor {
  username: string;
  displayName: string | null;
}

// Categoría fija de una encuesta (V2-021).
export interface Category {
  slug: string;
  name: string;
}

export interface PublicPoll {
  id: string;
  question: string;
  createdAt: string;
  // Cierre opcional (V2-013): desde esta fecha no se admiten votos.
  closesAt?: string | null;
  author?: PollAuthor | null;
  category?: Category | null;
  options: PollOption[];
}

export interface OptionResult extends PollOption {
  votes: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  // Nulo en una encuesta cerrada para quien no votó o no tiene sesión (V2-014).
  myOptionId: string | null;
  options: OptionResult[];
}

export type PollViewerState =
  | { kind: "anonymous" }
  | { kind: "not_voted" }
  | { kind: "voted"; results: PollResults }
  // Encuesta cerrada (D-020): resultados públicos para quien no votó. signedIn distingue al
  // visitante de quien tiene sesión (informa a la interfaz, p. ej. para denunciar).
  | { kind: "closed"; results: PollResults; signedIn: boolean };

// Relación de quien mira con un perfil (V2-006).
export type ViewerRelation = "self" | "none" | "pending" | "following";

// Cabecera de un perfil (V2-006). Los contadores son públicos también en cuentas privadas (S-4);
// canViewContent dice si se pueden ver sus encuestas y votos. Nunca incluye user_id.
export interface ProfileView {
  username: string;
  displayName: string | null;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  pollsCount: number;
  viewerRelation: ViewerRelation;
  canViewContent: boolean;
  avatarIcon?: AvatarIcon | null;
  // Sólo si el backend la entrega (cuenta visible para quien mira); ausente = sin bio u oculta.
  bio?: string;
}

// Voto visible en un perfil (V2-007). choice es null cuando la opción elegida no se puede revelar
// (P-1): la encuesta está abierta y quien mira no la ha votado. Nunca lleva recuentos.
export interface ProfileVote {
  pollId: string;
  question: string;
  pollCreatedAt: string;
  closesAt: string | null;
  author: PollAuthor | null;
  votedAt: string;
  choice: { optionId: string; text: string } | null;
}

// Persona en una lista de seguidores, seguidos o solicitudes (V2-009). Nunca incluye user_id.
export interface FollowEntry {
  username: string;
  displayName: string | null;
  avatarIcon?: AvatarIcon | null;
}

export interface FollowPage {
  users: FollowEntry[];
  nextCursor: string | null;
}

// Comentario del debate de una encuesta (CMT-001). Nunca incluye user_id.
export interface PollComment {
  id: string;
  username: string;
  displayName: string | null;
  body: string;
  createdAt: string;
}

export interface CommentPage {
  items: PollComment[];
  nextCursor: string | null;
}

export interface FeedItem {
  poll: PublicPoll;
  viewer: PollViewerState;
  // Sólo con sesión (V2-022): si la cuenta guardó la encuesta.
  saved?: boolean;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface PollDetail {
  poll: PublicPoll;
  viewer: PollViewerState;
  // Sólo con sesión (V2-022); sin él, no se sabe y la interfaz no lo muestra como guardada.
  saved?: boolean;
}

// Modos del feed (D-022): Recientes (todo lo visible) y Siguiendo (sólo cuentas seguidas con
// relación aceptada). Cronológicos ambos; el filtro de categoría es opcional («Todas»).
export type FeedMode = "recientes" | "siguiendo";

export interface FeedQuery {
  mode: FeedMode;
  category?: string | null;
  cursor?: string | null;
}

// PRIV-001: audiencia del historial; nunca amplía los permisos de la cuenta.
export type VoteVisibility = "private" | "followers" | "profile";

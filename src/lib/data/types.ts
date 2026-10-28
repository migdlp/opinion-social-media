// Tipos del dominio definidos en docs/contratos-api.md §5 (MVP-013).

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
  | "USERNAME_INVALID"
  | "USERNAME_TAKEN"
  | "USERNAME_RESERVED"
  | "DISPLAY_NAME_INVALID"
  | "PROFILE_REQUIRED"
  | "USER_NOT_FOUND"
  | "CANNOT_FOLLOW_SELF"
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

export interface FeedItem {
  poll: PublicPoll;
  viewer: PollViewerState;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface PollDetail {
  poll: PublicPoll;
  viewer: PollViewerState;
}

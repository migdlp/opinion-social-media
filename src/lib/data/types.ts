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

// Autor con perfil (V2-003). Sin perfil, PublicPoll.author es null y se muestra «Anónimo».
export interface PollAuthor {
  username: string;
  displayName: string | null;
}

export interface PublicPoll {
  id: string;
  question: string;
  createdAt: string;
  // Cierre opcional (V2-013): desde esta fecha no se admiten votos.
  closesAt?: string | null;
  author?: PollAuthor | null;
  options: PollOption[];
}

export interface OptionResult extends PollOption {
  votes: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  myOptionId: string;
  options: OptionResult[];
}

export type PollViewerState =
  { kind: "anonymous" } | { kind: "not_voted" } | { kind: "voted"; results: PollResults };

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

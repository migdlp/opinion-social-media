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

export interface PublicPoll {
  id: string;
  question: string;
  createdAt: string;
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

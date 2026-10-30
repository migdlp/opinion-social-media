// Compilado por npm run typecheck: verifica los contratos contra tipos generados.
import type { Database } from "./database.types";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type Public = Database["public"];

export type DatabaseContractChecks = [
  Assert<
    Equal<
      keyof Public["Tables"],
      | "polls"
      | "poll_options"
      | "votes"
      | "poll_reports"
      | "profiles"
      | "follows"
      | "categories"
      | "saved_polls"
      | "follow_quota_events"
      | "user_blocks"
    >
  >,
  Assert<
    Equal<
      Public["Tables"]["polls"]["Row"],
      {
        id: string;
        user_id: string;
        question: string;
        status: string;
        created_at: string;
        closes_at: string | null;
        category_slug: string | null;
      }
    >
  >,
  Assert<
    Equal<
      Public["Tables"]["poll_options"]["Row"],
      { id: string; poll_id: string; text: string; position: number }
    >
  >,
  Assert<
    Equal<
      Public["Tables"]["votes"]["Row"],
      { id: string; poll_id: string; option_id: string; user_id: string; created_at: string }
    >
  >,
  Assert<
    Equal<
      Public["Functions"]["create_poll"]["Args"],
      { p_question: string; p_options: string[]; p_closes_at?: string; p_category?: string }
    >
  >,
  Assert<Equal<Public["Functions"]["create_poll"]["Returns"], string>>,
  Assert<
    Equal<Public["Functions"]["vote_poll"]["Args"], { p_poll_id: string; p_option_id: string }>
  >,
  Assert<
    Equal<
      Public["Functions"]["vote_poll"]["Returns"],
      { poll_id: string; option_id: string; created_at: string }[]
    >
  >,
  Assert<Equal<Public["Functions"]["get_poll_results"]["Args"], { p_poll_id: string }>>,
  Assert<
    Equal<
      Public["Functions"]["get_poll_results"]["Returns"],
      {
        option_id: string;
        position: number;
        text: string;
        votes: number;
        percentage: number;
        total_votes: number;
        my_option_id: string;
      }[]
    >
  >,
  Assert<
    Equal<
      Public["Tables"]["profiles"]["Row"],
      {
        user_id: string;
        username: string;
        display_name: string | null;
        is_private: boolean;
        created_at: string;
        updated_at: string;
        vote_visibility: string;
        avatar_icon: string | null;
        bio: string | null;
      }
    >
  >,
  Assert<
    Equal<
      Public["Functions"]["upsert_my_profile"]["Args"],
      { p_username: string; p_display_name: string }
    >
  >,
  Assert<Equal<Public["Functions"]["set_profile_privacy"]["Args"], { p_private: boolean }>>,
  Assert<
    Equal<
      Public["Tables"]["follows"]["Row"],
      { follower_id: string; followee_id: string; status: string; created_at: string }
    >
  >,
  Assert<Equal<Public["Functions"]["follow_user"]["Args"], { p_username: string }>>,
  Assert<Equal<Public["Functions"]["follow_user"]["Returns"], string>>,
  Assert<
    Equal<
      Public["Functions"]["respond_follow_request"]["Args"],
      { p_username: string; p_accept: boolean }
    >
  >,
  Assert<
    Equal<
      Public["Functions"]["report_poll"]["Args"],
      { p_poll_id: string; p_reason: string; p_details?: string }
    >
  >,
  Assert<Equal<Public["Functions"]["get_my_profile"]["Args"], Record<PropertyKey, never>>>,
  Assert<Equal<Public["Functions"]["get_poll_authors"]["Args"], { p_poll_ids: string[] }>>,
  Assert<Equal<Public["Functions"]["can_view_author"]["Args"], { p_author: string }>>,
  Assert<Equal<Public["Functions"]["can_view_author"]["Returns"], boolean>>,
  Assert<Equal<Public["Functions"]["get_feed_results"]["Args"], { p_poll_ids: string[] }>>,
  Assert<
    Equal<
      Public["Functions"]["get_profile_votes"]["Args"],
      { p_username: string; p_cursor?: string }
    >
  >,
  Assert<Equal<Public["Functions"]["get_profile"]["Args"], { p_username: string }>>,
  Assert<
    Equal<
      Public["Functions"]["get_profile_polls"]["Args"],
      { p_username: string; p_cursor?: string }
    >
  >,
  Assert<Equal<Public["Functions"]["count_follow_requests"]["Returns"], number>>,
  Assert<Equal<Public["Functions"]["list_follow_requests"]["Args"], { p_cursor?: string }>>,
  Assert<
    Equal<Public["Functions"]["list_followers"]["Args"], { p_username: string; p_cursor?: string }>
  >,
  Assert<
    Equal<Public["Functions"]["list_following"]["Args"], { p_username: string; p_cursor?: string }>
  >,
  Assert<
    Equal<
      Public["Tables"]["saved_polls"]["Row"],
      { user_id: string; poll_id: string; created_at: string }
    >
  >,
  Assert<
    Equal<
      Public["Tables"]["saved_polls"]["Insert"],
      { poll_id: string; user_id?: string; created_at?: string }
    >
  >,
  Assert<
    Equal<
      Public["Functions"]["get_feed"]["Args"],
      { p_mode?: string; p_category?: string; p_cursor?: string }
    >
  >,
  Assert<
    Equal<
      Public["Functions"]["get_feed"]["Returns"],
      { poll_id: string; created_at: string; cursor: string }[]
    >
  >,
];

// PRIV-001: preferencia propia, sin identificador de usuario objetivo.
export type VoteVisibilityRpcChecks = [
  Assert<Equal<Public["Functions"]["get_my_vote_visibility"]["Args"], Record<PropertyKey, never>>>,
  Assert<Equal<Public["Functions"]["get_my_vote_visibility"]["Returns"], string>>,
  Assert<Equal<Public["Functions"]["set_vote_visibility"]["Args"], { p_visibility: string }>>,
  Assert<Equal<Public["Functions"]["set_vote_visibility"]["Returns"], undefined>>,
];

// AVATAR-001: sólo el titular elige un icono del catálogo (null = iniciales).
export type ProfileAvatarRpcChecks = [
  Assert<Equal<Public["Functions"]["set_profile_avatar"]["Args"], { p_icon: string }>>,
  Assert<Equal<Public["Functions"]["set_profile_avatar"]["Returns"], undefined>>,
  Assert<Equal<Public["Tables"]["profiles"]["Row"]["avatar_icon"], string | null>>,
  Assert<
    Equal<
      Public["Functions"]["get_my_profile"]["Returns"],
      {
        avatar_icon: string;
        bio: string;
        display_name: string;
        is_private: boolean;
        username: string;
      }[]
    >
  >,
];

// PROFILE-001: biografía opcional; sólo el titular la escribe y no es una columna pública.
export type ProfileBioRpcChecks = [
  Assert<Equal<Public["Functions"]["set_profile_bio"]["Args"], { p_bio: string }>>,
  Assert<Equal<Public["Functions"]["set_profile_bio"]["Returns"], undefined>>,
  Assert<Equal<Public["Tables"]["profiles"]["Row"]["bio"], string | null>>,
  Assert<Equal<Public["Functions"]["get_profile"]["Returns"][number]["bio"], string>>,
];

// SOCIAL-001: bloqueo de personas; la tabla sólo se gestiona con las RPC de la lista propia.
export type UserBlocksRpcChecks = [
  Assert<Equal<Public["Functions"]["block_user"]["Args"], { p_username: string }>>,
  Assert<Equal<Public["Functions"]["block_user"]["Returns"], undefined>>,
  Assert<Equal<Public["Functions"]["unblock_user"]["Args"], { p_username: string }>>,
  Assert<Equal<Public["Functions"]["list_blocked_users"]["Args"], { p_cursor?: string }>>,
  Assert<
    Equal<
      Public["Functions"]["list_blocked_users"]["Returns"][number],
      { cursor: string; display_name: string; username: string }
    >
  >,
  Assert<
    Equal<keyof Public["Tables"]["user_blocks"]["Row"], "blocked_id" | "blocker_id" | "created_at">
  >,
];

// SEARCH-001: búsqueda por pregunta; sólo ids, fecha y cursor (sin recuentos).
export type SearchPollsRpcChecks = [
  Assert<
    Equal<Public["Functions"]["search_polls"]["Args"], { p_cursor?: string; p_query: string }>
  >,
  Assert<
    Equal<
      Public["Functions"]["search_polls"]["Returns"][number],
      { created_at: string; cursor: string; poll_id: string }
    >
  >,
];

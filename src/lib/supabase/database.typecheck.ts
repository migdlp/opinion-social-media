// Compilado por npm run typecheck: verifica los contratos contra tipos generados.
import type { Database } from "./database.types";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type Public = Database["public"];

export type DatabaseContractChecks = [
  Assert<
    Equal<keyof Public["Tables"], "polls" | "poll_options" | "votes" | "poll_reports" | "profiles">
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
      { p_question: string; p_options: string[]; p_closes_at?: string }
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
      Public["Functions"]["report_poll"]["Args"],
      { p_poll_id: string; p_reason: string; p_details?: string }
    >
  >,
  Assert<Equal<Public["Functions"]["get_my_profile"]["Args"], never>>,
];

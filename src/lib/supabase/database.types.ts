export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          name: string;
          position: number;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          name: string;
          position: number;
          slug: string;
        };
        Update: {
          name?: string;
          position?: number;
          slug?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          poll_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          poll_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_quota_events: {
        Row: {
          created_at: string;
          id: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          user_id?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          created_at: string;
          followee_id: string;
          follower_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          followee_id: string;
          follower_id: string;
          status: string;
        };
        Update: {
          created_at?: string;
          followee_id?: string;
          follower_id?: string;
          status?: string;
        };
        Relationships: [];
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          position: number;
          text: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          poll_id: string;
          position: number;
          text: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          position?: number;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          poll_id: string;
          reason: string;
          reporter_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          poll_id: string;
          reason: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          poll_id?: string;
          reason?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_reports_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
      polls: {
        Row: {
          category_slug: string | null;
          closes_at: string | null;
          comments_enabled: boolean;
          created_at: string;
          id: string;
          question: string;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_slug?: string | null;
          closes_at?: string | null;
          comments_enabled?: boolean;
          created_at?: string;
          id?: string;
          question: string;
          status?: string;
          user_id: string;
        };
        Update: {
          category_slug?: string | null;
          closes_at?: string | null;
          comments_enabled?: boolean;
          created_at?: string;
          id?: string;
          question?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "polls_category_slug_fkey";
            columns: ["category_slug"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["slug"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_icon: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          is_private: boolean;
          updated_at: string;
          user_id: string;
          username: string;
          vote_visibility: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_icon?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          is_private?: boolean;
          updated_at?: string;
          user_id: string;
          username: string;
          vote_visibility?: string;
        };
        Update: {
          avatar_icon?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          is_private?: boolean;
          updated_at?: string;
          user_id?: string;
          username?: string;
          vote_visibility?: string;
        };
        Relationships: [];
      };
      saved_polls: {
        Row: {
          created_at: string;
          poll_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          poll_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_polls_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_option_belongs_to_poll_fkey";
            columns: ["poll_id", "option_id"];
            isOneToOne: false;
            referencedRelation: "poll_options";
            referencedColumns: ["poll_id", "id"];
          },
          {
            foreignKeyName: "votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_comment: { Args: { p_body: string; p_poll_id: string }; Returns: string };
      block_user: { Args: { p_username: string }; Returns: undefined };
      can_view_author: { Args: { p_author: string }; Returns: boolean };
      count_follow_requests: { Args: Record<PropertyKey, never>; Returns: number };
      create_poll: {
        Args: {
          p_category?: string;
          p_closes_at?: string;
          p_comments_enabled?: boolean;
          p_options: string[];
          p_question: string;
        };
        Returns: string;
      };
      follow_user: { Args: { p_username: string }; Returns: string };
      get_feed: {
        Args: { p_category?: string; p_cursor?: string; p_mode?: string };
        Returns: {
          created_at: string;
          cursor: string;
          poll_id: string;
        }[];
      };
      get_feed_results: {
        Args: { p_poll_ids: string[] };
        Returns: {
          my_option_id: string;
          option_id: string;
          percentage: number;
          poll_id: string;
          position: number;
          text: string;
          total_votes: number;
          votes: number;
        }[];
      };
      get_my_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avatar_icon: string;
          bio: string;
          display_name: string;
          is_private: boolean;
          username: string;
        }[];
      };
      get_my_vote_visibility: { Args: Record<PropertyKey, never>; Returns: string };
      get_poll_authors: {
        Args: { p_poll_ids: string[] };
        Returns: {
          display_name: string;
          poll_id: string;
          username: string;
        }[];
      };
      get_poll_results: {
        Args: { p_poll_id: string };
        Returns: {
          my_option_id: string;
          option_id: string;
          percentage: number;
          position: number;
          text: string;
          total_votes: number;
          votes: number;
        }[];
      };
      get_profile: {
        Args: { p_username: string };
        Returns: {
          bio: string;
          can_view_content: boolean;
          display_name: string;
          followers_count: number;
          following_count: number;
          is_private: boolean;
          polls_count: number;
          username: string;
          viewer_relation: string;
        }[];
      };
      get_profile_polls: {
        Args: { p_cursor?: string; p_username: string };
        Returns: {
          created_at: string;
          cursor: string;
          poll_id: string;
        }[];
      };
      get_profile_votes: {
        Args: { p_cursor?: string; p_username: string };
        Returns: {
          author_display_name: string;
          author_username: string;
          choice_hidden: boolean;
          closes_at: string;
          cursor: string;
          option_id: string;
          option_text: string;
          poll_created_at: string;
          poll_id: string;
          question: string;
          voted_at: string;
        }[];
      };
      list_blocked_users: {
        Args: { p_cursor?: string };
        Returns: {
          cursor: string;
          display_name: string;
          username: string;
        }[];
      };
      list_comments: {
        Args: { p_cursor?: string; p_poll_id: string };
        Returns: {
          body: string;
          comment_id: string;
          created_at: string;
          cursor: string;
          display_name: string;
          username: string;
        }[];
      };
      list_follow_requests: {
        Args: { p_cursor?: string };
        Returns: {
          cursor: string;
          display_name: string;
          username: string;
        }[];
      };
      list_followers: {
        Args: { p_cursor?: string; p_username: string };
        Returns: {
          cursor: string;
          display_name: string;
          username: string;
        }[];
      };
      list_following: {
        Args: { p_cursor?: string; p_username: string };
        Returns: {
          cursor: string;
          display_name: string;
          username: string;
        }[];
      };
      remove_follower: { Args: { p_username: string }; Returns: undefined };
      report_poll: {
        Args: { p_details?: string; p_poll_id: string; p_reason: string };
        Returns: undefined;
      };
      respond_follow_request: {
        Args: { p_accept: boolean; p_username: string };
        Returns: undefined;
      };
      search_polls: {
        Args: { p_cursor?: string; p_query: string };
        Returns: {
          created_at: string;
          cursor: string;
          poll_id: string;
        }[];
      };
      set_poll_comments: { Args: { p_enabled: boolean; p_poll_id: string }; Returns: undefined };
      set_profile_avatar: { Args: { p_icon: string }; Returns: undefined };
      set_profile_bio: { Args: { p_bio: string }; Returns: undefined };
      set_profile_privacy: { Args: { p_private: boolean }; Returns: undefined };
      set_vote_visibility: { Args: { p_visibility: string }; Returns: undefined };
      unblock_user: { Args: { p_username: string }; Returns: undefined };
      unfollow_user: { Args: { p_username: string }; Returns: undefined };
      upsert_my_profile: {
        Args: { p_display_name: string; p_username: string };
        Returns: {
          created_at: string;
          display_name: string;
          is_private: boolean;
          username: string;
        }[];
      };
      vote_poll: {
        Args: { p_option_id: string; p_poll_id: string };
        Returns: {
          created_at: string;
          option_id: string;
          poll_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      album_ratings: {
        Row: {
          album_title: string
          artist_name: string
          created_at: string
          id: string
          loved: boolean
          rating: number
          release_date: string | null
          release_group_id: string
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          album_title: string
          artist_name: string
          created_at?: string
          id?: string
          loved?: boolean
          rating: number
          release_date?: string | null
          release_group_id: string
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          album_title?: string
          artist_name?: string
          created_at?: string
          id?: string
          loved?: boolean
          rating?: number
          release_date?: string | null
          release_group_id?: string
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      album_ratings_agg: {
        Row: {
          album_title: string
          artist_name: string
          avg_rating: number
          rating_count: number
          release_group_id: string
          updated_at: string
        }
        Insert: {
          album_title: string
          artist_name: string
          avg_rating: number
          rating_count: number
          release_group_id: string
          updated_at?: string
        }
        Update: {
          album_title?: string
          artist_name?: string
          avg_rating?: number
          rating_count?: number
          release_group_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_updates: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          link: string | null
          title: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          link?: string | null
          title: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          link?: string | null
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      artist_follows: {
        Row: {
          artist_id: string
          artist_name: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          artist_id: string
          artist_name: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          artist_name?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_image_cache: {
        Row: {
          artist_id: string
          checked_at: string
          created_at: string
          image_url: string | null
        }
        Insert: {
          artist_id: string
          checked_at?: string
          created_at?: string
          image_url?: string | null
        }
        Update: {
          artist_id?: string
          checked_at?: string
          created_at?: string
          image_url?: string | null
        }
        Relationships: []
      }
      artist_ratings: {
        Row: {
          artist_id: string
          artist_name: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          artist_name: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          artist_name?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_ratings_agg: {
        Row: {
          artist_id: string
          artist_name: string
          avg_rating: number
          rating_count: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          artist_name: string
          avg_rating: number
          rating_count: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          artist_name?: string
          avg_rating?: number
          rating_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      artist_release_type_preferences: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          visible_types: string[]
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          visible_types?: string[]
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          visible_types?: string[]
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          album_title: string
          artist_name: string
          created_at: string
          id: string
          is_relisten: boolean
          listened_on: string
          notes: string | null
          rating: number | null
          release_group_id: string
          user_id: string
        }
        Insert: {
          album_title: string
          artist_name: string
          created_at?: string
          id?: string
          is_relisten?: boolean
          listened_on?: string
          notes?: string | null
          rating?: number | null
          release_group_id: string
          user_id: string
        }
        Update: {
          album_title?: string
          artist_name?: string
          created_at?: string
          id?: string
          is_relisten?: boolean
          listened_on?: string
          notes?: string | null
          rating?: number | null
          release_group_id?: string
          user_id?: string
        }
        Relationships: []
      }
      digest_email_logs: {
        Row: {
          emails_failed: number
          emails_sent: number
          id: string
          is_test: boolean
          sent_at: string
          total_users: number
          triggered_by: string | null
        }
        Insert: {
          emails_failed?: number
          emails_sent?: number
          id?: string
          is_test?: boolean
          sent_at?: string
          total_users?: number
          triggered_by?: string | null
        }
        Update: {
          emails_failed?: number
          emails_sent?: number
          id?: string
          is_test?: boolean
          sent_at?: string
          total_users?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
      digest_email_settings: {
        Row: {
          cta_text: string
          custom_note: string | null
          greeting: string
          id: string
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cta_text?: string
          custom_note?: string | null
          greeting?: string
          id?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cta_text?: string
          custom_note?: string | null
          greeting?: string
          id?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      favorite_albums: {
        Row: {
          album_title: string
          artist_name: string
          created_at: string
          id: string
          position: number
          release_group_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          album_title: string
          artist_name: string
          created_at?: string
          id?: string
          position: number
          release_group_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          album_title?: string
          artist_name?: string
          created_at?: string
          id?: string
          position?: number
          release_group_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          added_at: string
          album_title: string
          artist_name: string
          id: string
          list_id: string
          notes: string | null
          position: number | null
          release_group_id: string
        }
        Insert: {
          added_at?: string
          album_title: string
          artist_name: string
          id?: string
          list_id: string
          notes?: string | null
          position?: number | null
          release_group_id: string
        }
        Update: {
          added_at?: string
          album_title?: string
          artist_name?: string
          id?: string
          list_id?: string
          notes?: string | null
          position?: number | null
          release_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_status: {
        Row: {
          album_title: string
          artist_name: string
          created_at: string
          id: string
          is_listened: boolean
          is_loved: boolean
          is_to_listen: boolean
          release_group_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          album_title: string
          artist_name: string
          created_at?: string
          id?: string
          is_listened?: boolean
          is_loved?: boolean
          is_to_listen?: boolean
          release_group_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          album_title?: string
          artist_name?: string
          created_at?: string
          id?: string
          is_listened?: boolean
          is_loved?: boolean
          is_to_listen?: boolean
          release_group_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_friend_requests: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          default_release_types: string[]
          display_name: string | null
          email_friend_activity: boolean
          email_friend_requests: boolean
          email_new_releases: boolean
          email_notifications_enabled: boolean
          email_weekly_digest: boolean
          favorite_genres: string[] | null
          friends_only: boolean
          id: string
          is_public: boolean
          location: string | null
          show_albums: boolean
          show_artists: boolean
          show_diary: boolean
          show_friends_count: boolean
          show_friends_list: boolean
          show_lists: boolean
          updated_at: string
          username: string | null
          yearly_listen_goal: number | null
        }
        Insert: {
          allow_friend_requests?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_release_types?: string[]
          display_name?: string | null
          email_friend_activity?: boolean
          email_friend_requests?: boolean
          email_new_releases?: boolean
          email_notifications_enabled?: boolean
          email_weekly_digest?: boolean
          favorite_genres?: string[] | null
          friends_only?: boolean
          id: string
          is_public?: boolean
          location?: string | null
          show_albums?: boolean
          show_artists?: boolean
          show_diary?: boolean
          show_friends_count?: boolean
          show_friends_list?: boolean
          show_lists?: boolean
          updated_at?: string
          username?: string | null
          yearly_listen_goal?: number | null
        }
        Update: {
          allow_friend_requests?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_release_types?: string[]
          display_name?: string | null
          email_friend_activity?: boolean
          email_friend_requests?: boolean
          email_new_releases?: boolean
          email_notifications_enabled?: boolean
          email_weekly_digest?: boolean
          favorite_genres?: string[] | null
          friends_only?: boolean
          id?: string
          is_public?: boolean
          location?: string | null
          show_albums?: boolean
          show_artists?: boolean
          show_diary?: boolean
          show_friends_count?: boolean
          show_friends_list?: boolean
          show_lists?: boolean
          updated_at?: string
          username?: string | null
          yearly_listen_goal?: number | null
        }
        Relationships: []
      }
      release_group_official_cache: {
        Row: {
          checked_at: string
          created_at: string
          is_official: boolean
          release_group_id: string
        }
        Insert: {
          checked_at?: string
          created_at?: string
          is_official: boolean
          release_group_id: string
        }
        Update: {
          checked_at?: string
          created_at?: string
          is_official?: boolean
          release_group_id?: string
        }
        Relationships: []
      }
      release_inclusions: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          release_date: string | null
          release_group_id: string
          release_title: string
          release_type: string | null
          secondary_types: string[] | null
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          release_date?: string | null
          release_group_id: string
          release_title: string
          release_type?: string | null
          secondary_types?: string[] | null
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          release_date?: string | null
          release_group_id?: string
          release_title?: string
          release_type?: string | null
          secondary_types?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      release_overrides: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          is_hidden: boolean
          reason: string | null
          release_group_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          reason?: string | null
          release_group_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          reason?: string | null
          release_group_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          is_ranked: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_ranked?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_ranked?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      yearly_listening_goals: {
        Row: {
          created_at: string
          goal: number
          id: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          goal: number
          id?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          goal?: number
          id?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_profile: {
        Args: { profile_user_id: string; viewer_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: {
        Args: { blocker_user_id: string; target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

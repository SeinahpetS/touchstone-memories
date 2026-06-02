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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          data: Json
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_month: number | null
          birth_year: number | null
          cancel_at_period_end: boolean
          city: string | null
          country: string | null
          created_at: string
          current_period_end: string | null
          first_name: string | null
          id: string
          lat: number | null
          lng: number | null
          location_display: string | null
          name: string | null
          notification_preferences: Json
          onboarding_complete: boolean
          region: string | null
          save_offer_redeemed: boolean
          state: string | null
          stripe_customer_id: string | null
          stripe_env: string | null
          stripe_subscription_id: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          tier: string
          timezone: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          vivid_since: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_month?: number | null
          birth_year?: number | null
          cancel_at_period_end?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          current_period_end?: string | null
          first_name?: string | null
          id: string
          lat?: number | null
          lng?: number | null
          location_display?: string | null
          name?: string | null
          notification_preferences?: Json
          onboarding_complete?: boolean
          region?: string | null
          save_offer_redeemed?: boolean
          state?: string | null
          stripe_customer_id?: string | null
          stripe_env?: string | null
          stripe_subscription_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          tier?: string
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          vivid_since?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_month?: number | null
          birth_year?: number | null
          cancel_at_period_end?: boolean
          city?: string | null
          country?: string | null
          created_at?: string
          current_period_end?: string | null
          first_name?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_display?: string | null
          name?: string | null
          notification_preferences?: Json
          onboarding_complete?: boolean
          region?: string | null
          save_offer_redeemed?: boolean
          state?: string | null
          stripe_customer_id?: string | null
          stripe_env?: string | null
          stripe_subscription_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          tier?: string
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          vivid_since?: string | null
        }
        Relationships: []
      }
      story_sessions: {
        Row: {
          confirmed_artifact_ids: string[]
          created_at: string
          expires_at: string
          extracted_artifacts: Json
          highlight_spans: Json
          id: string
          status: string
          title: string | null
          transcript: string
          user_id: string
        }
        Insert: {
          confirmed_artifact_ids?: string[]
          created_at?: string
          expires_at?: string
          extracted_artifacts?: Json
          highlight_spans?: Json
          id?: string
          status?: string
          title?: string | null
          transcript?: string
          user_id: string
        }
        Update: {
          confirmed_artifact_ids?: string[]
          created_at?: string
          expires_at?: string
          extracted_artifacts?: Json
          highlight_spans?: Json
          id?: string
          status?: string
          title?: string | null
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      touchstones: {
        Row: {
          ai_answer: string | null
          ai_prompt: string | null
          audio_url: string | null
          category: Database["public"]["Enums"]["memory_category"]
          connected_to: string | null
          created_at: string
          emotional_tone: string | null
          id: string
          imprint_subtype: string | null
          is_premium_prompt: boolean
          is_private: boolean
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          memory_day: number | null
          memory_month: number | null
          memory_season: string | null
          memory_year: number | null
          note: string | null
          openlibrary_id: string | null
          people: string | null
          photo_url: string | null
          relationship_type: string | null
          sentiment: string | null
          source_url: string | null
          spotify_id: string | null
          still_in_touch: boolean | null
          title: string | null
          tmdb_id: string | null
          user_id: string
          venue_name: string | null
          when_text: string | null
          who_was_there: string | null
        }
        Insert: {
          ai_answer?: string | null
          ai_prompt?: string | null
          audio_url?: string | null
          category: Database["public"]["Enums"]["memory_category"]
          connected_to?: string | null
          created_at?: string
          emotional_tone?: string | null
          id?: string
          imprint_subtype?: string | null
          is_premium_prompt?: boolean
          is_private?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          memory_day?: number | null
          memory_month?: number | null
          memory_season?: string | null
          memory_year?: number | null
          note?: string | null
          openlibrary_id?: string | null
          people?: string | null
          photo_url?: string | null
          relationship_type?: string | null
          sentiment?: string | null
          source_url?: string | null
          spotify_id?: string | null
          still_in_touch?: boolean | null
          title?: string | null
          tmdb_id?: string | null
          user_id: string
          venue_name?: string | null
          when_text?: string | null
          who_was_there?: string | null
        }
        Update: {
          ai_answer?: string | null
          ai_prompt?: string | null
          audio_url?: string | null
          category?: Database["public"]["Enums"]["memory_category"]
          connected_to?: string | null
          created_at?: string
          emotional_tone?: string | null
          id?: string
          imprint_subtype?: string | null
          is_premium_prompt?: boolean
          is_private?: boolean
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          memory_day?: number | null
          memory_month?: number | null
          memory_season?: string | null
          memory_year?: number | null
          note?: string | null
          openlibrary_id?: string | null
          people?: string | null
          photo_url?: string | null
          relationship_type?: string | null
          sentiment?: string | null
          source_url?: string | null
          spotify_id?: string | null
          still_in_touch?: boolean | null
          title?: string | null
          tmdb_id?: string | null
          user_id?: string
          venue_name?: string | null
          when_text?: string | null
          who_was_there?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_vivid: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      memory_category:
        | "moment"
        | "person"
        | "object"
        | "place"
        | "food"
        | "sound"
        | "imprint"
        | "digital_traces"
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
      memory_category: [
        "moment",
        "person",
        "object",
        "place",
        "food",
        "sound",
        "imprint",
        "digital_traces",
      ],
    },
  },
} as const

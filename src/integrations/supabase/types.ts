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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      connected_accounts: {
        Row: {
          access_token: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          page_access_token: string | null
          page_id: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_user_id: string
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          page_access_token?: string | null
          page_id?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_user_id: string
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          page_access_token?: string | null
          page_id?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_user_id?: string
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_examples: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          tags: string[] | null
          title: string
          transcript: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          tags?: string[] | null
          title: string
          transcript: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          tags?: string[] | null
          title?: string
          transcript?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_kpis: {
        Row: {
          calls_booked: number | null
          calls_completed: number | null
          conversions_to_qualified: number | null
          created_at: string
          date: string
          dms_received: number | null
          dms_sent: number | null
          follow_ups_sent: number | null
          hours_worked: number | null
          id: string
          new_leads: number | null
          no_shows: number | null
          notes: string | null
          objections_handled: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          calls_booked?: number | null
          calls_completed?: number | null
          conversions_to_qualified?: number | null
          created_at?: string
          date: string
          dms_received?: number | null
          dms_sent?: number | null
          follow_ups_sent?: number | null
          hours_worked?: number | null
          id?: string
          new_leads?: number | null
          no_shows?: number | null
          notes?: string | null
          objections_handled?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          calls_booked?: number | null
          calls_completed?: number | null
          conversions_to_qualified?: number | null
          created_at?: string
          date?: string
          dms_received?: number | null
          dms_sent?: number | null
          follow_ups_sent?: number | null
          hours_worked?: number | null
          id?: string
          new_leads?: number | null
          no_shows?: number | null
          notes?: string | null
          objections_handled?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faq_entries: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      icp_profiles: {
        Row: {
          buying_triggers: string | null
          created_at: string
          demographics: string | null
          goals: string | null
          id: string
          is_active: boolean
          language_patterns: string | null
          name: string
          objections_common: string | null
          pains: string | null
          updated_at: string
          user_id: string
          where_they_hang_out: string | null
        }
        Insert: {
          buying_triggers?: string | null
          created_at?: string
          demographics?: string | null
          goals?: string | null
          id?: string
          is_active?: boolean
          language_patterns?: string | null
          name?: string
          objections_common?: string | null
          pains?: string | null
          updated_at?: string
          user_id: string
          where_they_hang_out?: string | null
        }
        Update: {
          buying_triggers?: string | null
          created_at?: string
          demographics?: string | null
          goals?: string | null
          id?: string
          is_active?: boolean
          language_patterns?: string | null
          name?: string
          objections_common?: string | null
          pains?: string | null
          updated_at?: string
          user_id?: string
          where_they_hang_out?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          platform_message_id: string | null
          prospect_id: string
          sender: string
          sent_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          platform_message_id?: string | null
          prospect_id: string
          sender: string
          sent_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          platform_message_id?: string | null
          prospect_id?: string
          sender?: string
          sent_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      objection_entries: {
        Row: {
          category: string
          created_at: string
          framework: string | null
          id: string
          objection: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          framework?: string | null
          id?: string
          objection: string
          response: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          framework?: string | null
          id?: string
          objection?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_profiles: {
        Row: {
          competitors: string
          core_promise: string
          created_at: string
          cta_goal: string
          description: string
          guarantee: string
          id: string
          ideal_client: string
          industry: string
          is_active: boolean
          market_awareness: string
          market_sophistication: string
          objections: Json
          offer_name: string
          price: string
          proof: string
          tone: string
          updated_at: string
          user_id: string
          value_props: string[]
        }
        Insert: {
          competitors?: string
          core_promise?: string
          created_at?: string
          cta_goal?: string
          description?: string
          guarantee?: string
          id?: string
          ideal_client?: string
          industry?: string
          is_active?: boolean
          market_awareness?: string
          market_sophistication?: string
          objections?: Json
          offer_name?: string
          price?: string
          proof?: string
          tone?: string
          updated_at?: string
          user_id: string
          value_props?: string[]
        }
        Update: {
          competitors?: string
          core_promise?: string
          created_at?: string
          cta_goal?: string
          description?: string
          guarantee?: string
          id?: string
          ideal_client?: string
          industry?: string
          is_active?: boolean
          market_awareness?: string
          market_sophistication?: string
          objections?: Json
          offer_name?: string
          price?: string
          proof?: string
          tone?: string
          updated_at?: string
          user_id?: string
          value_props?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          avatar_url: string | null
          call_readiness: number | null
          concerns: string | null
          concerns_confidence: number | null
          connected_account_id: string | null
          created_at: string
          current_job: string | null
          handle: string | null
          id: string
          income_goal: string | null
          intent_confidence: number | null
          intent_level: string | null
          last_contact_at: string | null
          lead_score: number | null
          location: string | null
          motivation: string | null
          motivation_confidence: number | null
          name: string
          notes: string | null
          platform: Database["public"]["Enums"]["platform_type"] | null
          platform_thread_id: string | null
          source: string | null
          stage: string
          tags: string[] | null
          time_availability: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          call_readiness?: number | null
          concerns?: string | null
          concerns_confidence?: number | null
          connected_account_id?: string | null
          created_at?: string
          current_job?: string | null
          handle?: string | null
          id?: string
          income_goal?: string | null
          intent_confidence?: number | null
          intent_level?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          location?: string | null
          motivation?: string | null
          motivation_confidence?: number | null
          name: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          platform_thread_id?: string | null
          source?: string | null
          stage?: string
          tags?: string[] | null
          time_availability?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          call_readiness?: number | null
          concerns?: string | null
          concerns_confidence?: number | null
          connected_account_id?: string | null
          created_at?: string
          current_job?: string | null
          handle?: string | null
          id?: string
          income_goal?: string | null
          intent_confidence?: number | null
          intent_level?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          location?: string | null
          motivation?: string | null
          motivation_confidence?: number | null
          name?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform_type"] | null
          platform_thread_id?: string | null
          source?: string | null
          stage?: string
          tags?: string[] | null
          time_availability?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_favorite: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          occurred_at: string
          prospect_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          occurred_at?: string
          prospect_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          occurred_at?: string
          prospect_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attempts: {
        Row: {
          created_at: string
          difficulty: string | null
          grade: string | null
          id: string
          improvements: Json
          scenario_name: string
          strengths: Json
          summary: string | null
          transcript: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          grade?: string | null
          id?: string
          improvements?: Json
          scenario_name: string
          strengths?: Json
          summary?: string | null
          transcript?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          grade?: string | null
          id?: string
          improvements?: Json
          scenario_name?: string
          strengths?: Json
          summary?: string | null
          transcript?: Json
          user_id?: string
        }
        Relationships: []
      }
      win_loss_logs: {
        Row: {
          created_at: string
          id: string
          lesson: string | null
          outcome: string
          prospect_name: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson?: string | null
          outcome?: string
          prospect_name?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson?: string | null
          outcome?: string
          prospect_name?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      platform_type: "instagram" | "facebook" | "whatsapp" | "hubspot"
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
      platform_type: ["instagram", "facebook", "whatsapp", "hubspot"],
    },
  },
} as const

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
      admin_master_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      admin_realtime_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          table_name: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          table_name: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          table_name?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          expires_at: string
          id: string
          ip: string | null
          issued_at: string
          jti: string
          revoked: boolean
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          expires_at: string
          id?: string
          ip?: string | null
          issued_at?: string
          jti: string
          revoked?: boolean
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          expires_at?: string
          id?: string
          ip?: string | null
          issued_at?: string
          jti?: string
          revoked?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          last_login_at: string | null
          locked_until: string | null
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          singleton: boolean
          support_whatsapp: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          singleton?: boolean
          support_whatsapp?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          singleton?: boolean
          support_whatsapp?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
          sender_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          sender_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          sender_type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          account_name: string
          account_number: string
          amount: string
          bank_name: string
          created_at: string
          id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount?: string
          bank_name: string
          created_at?: string
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: string
          bank_name?: string
          created_at?: string
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_activated: boolean
          purchase_id: string | null
          user_id: string
          withdrawal_stage: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_activated?: boolean
          purchase_id?: string | null
          user_id: string
          withdrawal_stage?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_activated?: boolean
          purchase_id?: string | null
          user_id?: string
          withdrawal_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "promo_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_purchases: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          receipt_image: string | null
          status: string
          user_id: string
          username: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          receipt_image?: string | null
          status?: string
          user_id: string
          username: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          receipt_image?: string | null
          status?: string
          user_id?: string
          username?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_app_state: {
        Row: {
          balance: number
          created_at: string
          gift_claimed: boolean
          id: string
          updated_at: string
          user_id: string
          wallet_unlocked: boolean
        }
        Insert: {
          balance?: number
          created_at?: string
          gift_claimed?: boolean
          id?: string
          updated_at?: string
          user_id: string
          wallet_unlocked?: boolean
        }
        Update: {
          balance?: number
          created_at?: string
          gift_claimed?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          wallet_unlocked?: boolean
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at: string
          id: string
          promo_code_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          promo_code_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          promo_code_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

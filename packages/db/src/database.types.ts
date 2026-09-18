export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string
          created_at: string
          detail: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label: string
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          state: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          state?: string
        }
        Relationships: []
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          city_id: string | null
          claimed_by: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          images: string[]
          kind: string
          min_age: number
          organizer_id: string | null
          refund_policy: string
          slug: string
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
        }
        Insert: {
          category_id?: string | null
          city_id?: string | null
          claimed_by?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          images?: string[]
          kind?: string
          min_age?: number
          organizer_id?: string | null
          refund_policy?: string
          slug: string
          source?: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
        }
        Update: {
          category_id?: string | null
          city_id?: string | null
          claimed_by?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          images?: string[]
          kind?: string
          min_age?: number
          organizer_id?: string | null
          refund_policy?: string
          slug?: string
          source?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "organizer_balances"
            referencedColumns: ["organizer_id"]
          },
          {
            foreignKeyName: "events_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_balances"
            referencedColumns: ["organizer_id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          date: string
          id: string
          margin_pct: number
          rate_applied: number
          rate_bcv: number
          source: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          margin_pct?: number
          rate_applied: number
          rate_bcv: number
          source?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          margin_pct?: number
          rate_applied?: number
          rate_bcv?: number
          source?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_entries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_id: string | null
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          points: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string | null
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          commission_cents: number
          created_at: string
          currency_paid: string | null
          event_id: string
          expires_at: string
          id: string
          idempotency_key: string
          organizer_net_cents: number
          paid_at: string | null
          quantity: number
          rate_used: number | null
          service_fee_cents: number
          status: string
          subtotal_cents: number
          ticket_type_id: string
          total_bs: number | null
          total_usd_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_cents: number
          created_at?: string
          currency_paid?: string | null
          event_id: string
          expires_at: string
          id?: string
          idempotency_key: string
          organizer_net_cents: number
          paid_at?: string | null
          quantity: number
          rate_used?: number | null
          service_fee_cents: number
          status?: string
          subtotal_cents: number
          ticket_type_id: string
          total_bs?: number | null
          total_usd_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_cents?: number
          created_at?: string
          currency_paid?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          organizer_net_cents?: number
          paid_at?: string | null
          quantity?: number
          rate_used?: number | null
          service_fee_cents?: number
          status?: string
          subtotal_cents?: number
          ticket_type_id?: string
          total_bs?: number | null
          total_usd_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          bio: string | null
          city_id: string | null
          commission_rate: number
          contact_phone: string | null
          cover_url: string | null
          created_at: string
          id: string
          is_plann_own: boolean
          legal_document: string | null
          logo_url: string | null
          name: string
          owner_user_id: string
          plan: string
          slug: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          bio?: string | null
          city_id?: string | null
          commission_rate?: number
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_plann_own?: boolean
          legal_document?: string | null
          logo_url?: string | null
          name: string
          owner_user_id: string
          plan?: string
          slug: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          bio?: string | null
          city_id?: string | null
          commission_rate?: number
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_plann_own?: boolean
          legal_document?: string | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          plan?: string
          slug?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: string
          order_id: string
          payer_bank: string | null
          payer_document: string | null
          payer_phone: string | null
          receipt_url: string | null
          receiving_account_id: string | null
          reference: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          id?: string
          method: string
          order_id: string
          payer_bank?: string | null
          payer_document?: string | null
          payer_phone?: string | null
          receipt_url?: string | null
          receiving_account_id?: string | null
          reference: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          order_id?: string
          payer_bank?: string | null
          payer_document?: string | null
          payer_phone?: string | null
          receipt_url?: string | null
          receiving_account_id?: string | null
          reference?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receiving_account_id_fkey"
            columns: ["receiving_account_id"]
            isOneToOne: false
            referencedRelation: "receiving_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_accounts: {
        Row: {
          created_at: string
          details: Json
          id: string
          is_active: boolean
          label: string
          show_in_app: boolean
          type: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          is_active?: boolean
          label: string
          show_in_app?: boolean
          type: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          is_active?: boolean
          label?: string
          show_in_app?: boolean
          type?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          max_per_order: number
          min_per_order: number
          name: string
          price_cents: number
          quantity: number
          reserved: number
          sales_end: string | null
          sales_start: string | null
          sold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          max_per_order?: number
          min_per_order?: number
          name?: string
          price_cents?: number
          quantity: number
          reserved?: number
          sales_end?: string | null
          sales_start?: string | null
          sold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          max_per_order?: number
          min_per_order?: number
          name?: string
          price_cents?: number
          quantity?: number
          reserved?: number
          sales_end?: string | null
          sales_start?: string | null
          sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          attendee_document: string | null
          attendee_name: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          code: string
          created_at: string
          event_id: string
          id: string
          order_id: string
          qr_signature: string
          status: string
          ticket_type_id: string
          user_id: string
        }
        Insert: {
          attendee_document?: string | null
          attendee_name?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          code: string
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          qr_signature: string
          status?: string
          ticket_type_id: string
          user_id: string
        }
        Update: {
          attendee_document?: string | null
          attendee_name?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          qr_signature?: string
          status?: string
          ticket_type_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city_id: string | null
          created_at: string
          document_id: string | null
          email: string
          full_name: string | null
          id: string
          interests: string[]
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city_id?: string | null
          created_at?: string
          document_id?: string | null
          email: string
          full_name?: string | null
          id: string
          interests?: string[]
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city_id?: string | null
          created_at?: string
          document_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          interests?: string[]
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount_cents: number
          id: string
          method: string
          organizer_id: string
          reference: string | null
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          id?: string
          method: string
          organizer_id: string
          reference?: string | null
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          id?: string
          method?: string
          organizer_id?: string
          reference?: string | null
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_balances"
            referencedColumns: ["organizer_id"]
          },
          {
            foreignKeyName: "withdrawals_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organizer_balances: {
        Row: {
          balance_available_cents: number | null
          net_paid_cents: number | null
          organizer_id: string | null
          pending_withdrawal_cents: number | null
          withdrawn_cents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_review_payment: {
        Args: {
          p_decision: string
          p_payment_id: string
          p_rejection_reason?: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: string
          order_id: string
          payer_bank: string | null
          payer_document: string | null
          payer_phone: string | null
          receipt_url: string | null
          receiving_account_id: string | null
          reference: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      checkin_ticket: {
        Args: { p_code: string; p_event_id?: string }
        Returns: Json
      }
      create_order: {
        Args: {
          p_idempotency_key: string
          p_quantity: number
          p_ticket_type_id: string
        }
        Returns: {
          commission_cents: number
          created_at: string
          currency_paid: string | null
          event_id: string
          expires_at: string
          id: string
          idempotency_key: string
          organizer_net_cents: number
          paid_at: string | null
          quantity: number
          rate_used: number | null
          service_fee_cents: number
          status: string
          subtotal_cents: number
          ticket_type_id: string
          total_bs: number | null
          total_usd_cents: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_stale_orders: { Args: never; Returns: number }
      generate_ticket_code: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_organizer_owner: {
        Args: { target_organizer_id: string }
        Returns: boolean
      }
      submit_payment: {
        Args: {
          p_method: string
          p_order_id: string
          p_payer_bank?: string
          p_payer_document?: string
          p_payer_phone?: string
          p_receipt_url?: string
          p_receiving_account_id?: string
          p_reference: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: string
          order_id: string
          payer_bank: string | null
          payer_document: string | null
          payer_phone: string | null
          receipt_url: string | null
          receiving_account_id: string | null
          reference: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


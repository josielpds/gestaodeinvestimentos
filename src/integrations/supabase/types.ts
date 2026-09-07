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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      dividends: {
        Row: {
          amount: number
          amount_per_share: number
          created_at: string
          id: string
          investment_id: string
          payment_date: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_per_share?: number
          created_at?: string
          id?: string
          investment_id: string
          payment_date?: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_per_share?: number
          created_at?: string
          id?: string
          investment_id?: string
          payment_date?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          category: string | null
          created_at: string
          id: string
          notes: string | null
          target_amount: number
          target_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_amount?: number
          target_date?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_amount?: number
          target_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          average_price: number
          category: string
          contract_rate: string | null
          created_at: string
          current_balance: number
          current_price: number
          due_date: string | null
          connection_id: string | null
          external_id: string | null
          id: string
          indexer: string
          initial_amount: number
          institution: string
          is_automated: boolean
          liquidity: string
          name: string
          notes: string | null
          quantity: number
          start_date: string
          status: string
          sub_type: string
          tax_exempt: boolean
          ticker: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_price?: number
          category?: string
          connection_id?: string | null
          contract_rate?: string | null
          created_at?: string
          current_balance?: number
          current_price?: number
          due_date?: string | null
          external_id?: string | null
          id?: string
          indexer?: string
          initial_amount?: number
          institution?: string
          is_automated?: boolean
          liquidity?: string
          name: string
          notes?: string | null
          quantity?: number
          start_date?: string
          status?: string
          sub_type?: string
          tax_exempt?: boolean
          ticker?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_price?: number
          category?: string
          connection_id?: string | null
          contract_rate?: string | null
          created_at?: string
          current_balance?: number
          current_price?: number
          due_date?: string | null
          external_id?: string | null
          id?: string
          indexer?: string
          initial_amount?: number
          institution?: string
          is_automated?: boolean
          liquidity?: string
          name?: string
          notes?: string | null
          quantity?: number
          start_date?: string
          status?: string
          sub_type?: string
          tax_exempt?: boolean
          ticker?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "open_finance_connections"
            referencedColumns: ["id"]
          }
        ]
      }
      open_finance_connections: {
        Row: {
          connector_id: number | null
          created_at: string
          id: string
          institution_logo: string | null
          institution_name: string
          item_id: string
          last_synced_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connector_id?: number | null
          created_at?: string
          id?: string
          institution_logo?: string | null
          institution_name: string
          item_id: string
          last_synced_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connector_id?: number | null
          created_at?: string
          id?: string
          institution_logo?: string | null
          institution_name?: string
          item_id?: string
          last_synced_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_snapshots: {
        Row: {
          cdi_benchmark: number
          created_at: string
          deposits: number
          earnings: number
          final_balance: number
          ibovespa_benchmark: number
          id: string
          initial_balance: number
          investment_id: string | null
          ipca_benchmark: number
          profit_amount: number
          profit_percent: number
          updated_at: string
          user_id: string
          withdrawals: number
          year_month: string
        }
        Insert: {
          cdi_benchmark?: number
          created_at?: string
          deposits?: number
          earnings?: number
          final_balance?: number
          ibovespa_benchmark?: number
          id?: string
          initial_balance?: number
          investment_id?: string | null
          ipca_benchmark?: number
          profit_amount?: number
          profit_percent?: number
          updated_at?: string
          user_id: string
          withdrawals?: number
          year_month: string
        }
        Update: {
          cdi_benchmark?: number
          created_at?: string
          deposits?: number
          earnings?: number
          final_balance?: number
          ibovespa_benchmark?: number
          id?: string
          initial_balance?: number
          investment_id?: string | null
          ipca_benchmark?: number
          profit_amount?: number
          profit_percent?: number
          updated_at?: string
          user_id?: string
          withdrawals?: number
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_snapshots_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_targets: {
        Row: {
          category: string
          created_at: string
          id: string
          target_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          target_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          target_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          investment_id: string
          notes: string | null
          quantity: number
          type: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          investment_id: string
          notes?: string | null
          quantity?: number
          type?: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          investment_id?: string
          notes?: string | null
          quantity?: number
          type?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
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

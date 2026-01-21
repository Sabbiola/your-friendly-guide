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
      bot_settings: {
        Row: {
          api_key: string
          auto_sell_enabled: boolean | null
          created_at: string
          id: string
          max_position_size_sol: number | null
          stop_loss_percent: number | null
          take_profit_percent: number | null
          telegram_notifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string
          auto_sell_enabled?: boolean | null
          created_at?: string
          id?: string
          max_position_size_sol?: number | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          telegram_notifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          auto_sell_enabled?: boolean | null
          created_at?: string
          id?: string
          max_position_size_sol?: number | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          telegram_notifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      copy_trade_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean | null
          max_position_sol: number | null
          slippage_percent: number | null
          updated_at: string
          use_jupiter: boolean | null
          use_pumpfun: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          max_position_sol?: number | null
          slippage_percent?: number | null
          updated_at?: string
          use_jupiter?: boolean | null
          use_pumpfun?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          max_position_sol?: number | null
          slippage_percent?: number | null
          updated_at?: string
          use_jupiter?: boolean | null
          use_pumpfun?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      copy_trades: {
        Row: {
          created_at: string
          error_message: string | null
          executed_amount_sol: number | null
          executed_at: string | null
          id: string
          platform: string | null
          source_amount_sol: number
          source_signature: string
          source_wallet_id: string | null
          status: string | null
          token_mint: string
          token_symbol: string
          trade_type: string
          tx_signature: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          executed_amount_sol?: number | null
          executed_at?: string | null
          id?: string
          platform?: string | null
          source_amount_sol: number
          source_signature: string
          source_wallet_id?: string | null
          status?: string | null
          token_mint: string
          token_symbol: string
          trade_type: string
          tx_signature?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          executed_amount_sol?: number | null
          executed_at?: string | null
          id?: string
          platform?: string | null
          source_amount_sol?: number
          source_signature?: string
          source_wallet_id?: string | null
          status?: string | null
          token_mint?: string
          token_symbol?: string
          trade_type?: string
          tx_signature?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_trades_source_wallet_id_fkey"
            columns: ["source_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string
          id: number
          level: string
          message: string
          module: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          level?: string
          message: string
          module?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          level?: string
          message?: string
          module?: string
          user_id?: string | null
        }
        Relationships: []
      }
      performance_stats: {
        Row: {
          created_at: string
          date: string
          id: string
          losing_trades: number | null
          total_pnl_sol: number | null
          total_trades: number | null
          total_volume_sol: number | null
          user_id: string
          winning_trades: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          losing_trades?: number | null
          total_pnl_sol?: number | null
          total_trades?: number | null
          total_volume_sol?: number | null
          user_id: string
          winning_trades?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          losing_trades?: number | null
          total_pnl_sol?: number | null
          total_trades?: number | null
          total_volume_sol?: number | null
          user_id?: string
          winning_trades?: number | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          amount: number
          avg_buy_price: number | null
          created_at: string
          current_price: number | null
          entry_price: number | null
          id: string
          is_open: boolean | null
          source: string | null
          stop_loss_percent: number | null
          take_profit_percent: number | null
          token_mint: string
          token_symbol: string
          unrealized_pnl_percent: number | null
          unrealized_pnl_sol: number | null
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount?: number
          avg_buy_price?: number | null
          created_at?: string
          current_price?: number | null
          entry_price?: number | null
          id?: string
          is_open?: boolean | null
          source?: string | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          token_mint: string
          token_symbol: string
          unrealized_pnl_percent?: number | null
          unrealized_pnl_sol?: number | null
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          avg_buy_price?: number | null
          created_at?: string
          current_price?: number | null
          entry_price?: number | null
          id?: string
          is_open?: boolean | null
          source?: string | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          token_mint?: string
          token_symbol?: string
          unrealized_pnl_percent?: number | null
          unrealized_pnl_sol?: number | null
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          telegram_chat_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scanned_tokens: {
        Row: {
          age_minutes: number | null
          bonding_curve_percent: number | null
          bot_users: number | null
          buys_24h: number | null
          created_at_token: string | null
          dev_holding_percent: number | null
          dex_id: string | null
          holders_count: number | null
          id: string
          insiders_percent: number | null
          liquidity_usd: number | null
          market_cap: number | null
          mint: string
          name: string | null
          pair_address: string | null
          price_change_1h: number | null
          price_change_24h: number | null
          price_change_5m: number | null
          price_usd: number | null
          risk_score: number | null
          scanned_at: string
          sells_24h: number | null
          symbol: string | null
          top_10_holders_percent: number | null
          txns_24h: number | null
          user_id: string
          volume_24h: number | null
        }
        Insert: {
          age_minutes?: number | null
          bonding_curve_percent?: number | null
          bot_users?: number | null
          buys_24h?: number | null
          created_at_token?: string | null
          dev_holding_percent?: number | null
          dex_id?: string | null
          holders_count?: number | null
          id?: string
          insiders_percent?: number | null
          liquidity_usd?: number | null
          market_cap?: number | null
          mint: string
          name?: string | null
          pair_address?: string | null
          price_change_1h?: number | null
          price_change_24h?: number | null
          price_change_5m?: number | null
          price_usd?: number | null
          risk_score?: number | null
          scanned_at?: string
          sells_24h?: number | null
          symbol?: string | null
          top_10_holders_percent?: number | null
          txns_24h?: number | null
          user_id: string
          volume_24h?: number | null
        }
        Update: {
          age_minutes?: number | null
          bonding_curve_percent?: number | null
          bot_users?: number | null
          buys_24h?: number | null
          created_at_token?: string | null
          dev_holding_percent?: number | null
          dex_id?: string | null
          holders_count?: number | null
          id?: string
          insiders_percent?: number | null
          liquidity_usd?: number | null
          market_cap?: number | null
          mint?: string
          name?: string | null
          pair_address?: string | null
          price_change_1h?: number | null
          price_change_24h?: number | null
          price_change_5m?: number | null
          price_usd?: number | null
          risk_score?: number | null
          scanned_at?: string
          sells_24h?: number | null
          symbol?: string | null
          top_10_holders_percent?: number | null
          txns_24h?: number | null
          user_id?: string
          volume_24h?: number | null
        }
        Relationships: []
      }
      scanner_settings: {
        Row: {
          created_at: string
          id: string
          max_age_minutes: number | null
          max_dev_holding_percent: number | null
          max_insiders_percent: number | null
          max_market_cap: number | null
          min_bonding_curve_percent: number | null
          min_bot_users: number | null
          min_fees_percent: number | null
          min_market_cap: number | null
          min_volume_usd: number | null
          refresh_interval_seconds: number | null
          updated_at: string
          use_pump: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_age_minutes?: number | null
          max_dev_holding_percent?: number | null
          max_insiders_percent?: number | null
          max_market_cap?: number | null
          min_bonding_curve_percent?: number | null
          min_bot_users?: number | null
          min_fees_percent?: number | null
          min_market_cap?: number | null
          min_volume_usd?: number | null
          refresh_interval_seconds?: number | null
          updated_at?: string
          use_pump?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_age_minutes?: number | null
          max_dev_holding_percent?: number | null
          max_insiders_percent?: number | null
          max_market_cap?: number | null
          min_bonding_curve_percent?: number | null
          min_bot_users?: number | null
          min_fees_percent?: number | null
          min_market_cap?: number | null
          min_volume_usd?: number | null
          refresh_interval_seconds?: number | null
          updated_at?: string
          use_pump?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          amount_sol: number
          amount_token: number
          created_at: string
          id: string
          pnl_percent: number | null
          pnl_sol: number | null
          price_usd: number | null
          status: string | null
          token_mint: string
          token_symbol: string
          trade_type: string
          tx_signature: string | null
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount_sol: number
          amount_token: number
          created_at?: string
          id?: string
          pnl_percent?: number | null
          pnl_sol?: number | null
          price_usd?: number | null
          status?: string | null
          token_mint: string
          token_symbol: string
          trade_type: string
          tx_signature?: string | null
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount_sol?: number
          amount_token?: number
          created_at?: string
          id?: string
          pnl_percent?: number | null
          pnl_sol?: number | null
          price_usd?: number | null
          status?: string | null
          token_mint?: string
          token_symbol?: string
          trade_type?: string
          tx_signature?: string | null
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          address: string
          balance_sol: number | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          balance_sol?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          balance_sol?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
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

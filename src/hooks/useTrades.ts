import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Trade {
  id: string;
  user_id: string;
  wallet_id: string | null;
  token_mint: string;
  token_symbol: string;
  trade_type: 'buy' | 'sell';
  amount_token: number;
  amount_sol: number;
  price_usd: number | null;
  tx_signature: string | null;
  status: string;
  pnl_sol: number | null;
  pnl_percent: number | null;
  created_at: string;
}

export function useTrades(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trades', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Trade[];
    },
    enabled: !!user,
  });
}

export function useRecentTrades(limit = 10) {
  return useTrades(limit);
}

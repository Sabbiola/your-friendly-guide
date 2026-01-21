import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Position {
  id: string;
  user_id: string;
  wallet_id: string | null;
  token_mint: string;
  token_symbol: string;
  amount: number;
  avg_buy_price: number | null;
  current_price: number | null;
  unrealized_pnl_sol: number | null;
  unrealized_pnl_percent: number | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export function usePositions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['positions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Position[];
    },
    enabled: !!user,
  });
}

export function useOpenPositions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['positions', 'open', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_open', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Position[];
    },
    enabled: !!user,
  });
}

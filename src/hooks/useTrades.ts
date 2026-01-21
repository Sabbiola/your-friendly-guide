import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Trade {
  id: string;
  mint: string;
  symbol: string | null;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  pnl: number;
  pnl_percent: number | null;
  tx_hash: string | null;
  traded_at: string;
}

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    const fetchTrades = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('traded_at', { ascending: false })
          .limit(100);

        if (fetchError) throw fetchError;
        setTrades(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trades');
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('trades-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setTrades((prev) => [payload.new as Trade, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { trades, loading, error };
}

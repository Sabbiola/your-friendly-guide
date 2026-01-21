import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Position {
  id: string;
  mint: string;
  symbol: string | null;
  entry_price: number;
  current_price: number | null;
  amount: number;
  pnl: number;
  pnl_percent: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  updated_at: string;
}

export function usePositions() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPositions([]);
      setLoading(false);
      return;
    }

    // Initial fetch - only open positions
    const fetchPositions = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false });

        if (fetchError) throw fetchError;
        setPositions(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch positions');
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('positions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'positions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPositions((prev) => [payload.new as Position, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPositions((prev) =>
              prev.map((pos) =>
                pos.id === payload.new.id ? (payload.new as Position) : pos
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPositions((prev) =>
              prev.filter((pos) => pos.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { positions, loading, error };
}

// Export alias for backwards compatibility
export const useOpenPositions = usePositions;


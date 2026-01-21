import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DashboardStats {
  totalPnl: number;
  totalTrades: number;
  tradesToday: number;
  winRate: number;
  activeWallets: number;
  openPositions: number;
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) {
        return {
          totalPnl: 0,
          totalTrades: 0,
          tradesToday: 0,
          winRate: 0,
          activeWallets: 0,
          openPositions: 0,
        };
      }

      // Get all trades
      const { data: trades } = await supabase
        .from('trades')
        .select('pnl_sol, created_at')
        .eq('user_id', user.id);

      // Get today's trades
      const today = new Date().toISOString().split('T')[0];
      const tradesToday = trades?.filter(t => t.created_at.startsWith(today)).length || 0;

      // Calculate PnL
      const totalPnl = trades?.reduce((sum, t) => sum + (Number(t.pnl_sol) || 0), 0) || 0;
      const winningTrades = trades?.filter(t => (Number(t.pnl_sol) || 0) > 0).length || 0;
      const winRate = trades?.length ? (winningTrades / trades.length) * 100 : 0;

      // Get active wallets
      const { count: activeWallets } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Get open positions
      const { count: openPositions } = await supabase
        .from('positions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_open', true);

      return {
        totalPnl,
        totalTrades: trades?.length || 0,
        tradesToday,
        winRate,
        activeWallets: activeWallets || 0,
        openPositions: openPositions || 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

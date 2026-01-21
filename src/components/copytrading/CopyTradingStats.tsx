import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  Trophy,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface CopyTrade {
  id: string;
  source_wallet_id: string | null;
  token_symbol: string;
  trade_type: string;
  source_amount_sol: number;
  executed_amount_sol: number | null;
  status: string;
  platform: string | null;
  created_at: string;
}

interface WalletStats {
  walletId: string;
  walletName: string;
  walletAddress: string;
  totalTrades: number;
  successfulTrades: number;
  successRate: number;
  totalVolume: number;
}

export function CopyTradingStats() {
  const { user } = useAuth();
  const [copyTrades, setCopyTrades] = useState<CopyTrade[]>([]);
  const [wallets, setWallets] = useState<Map<string, { name: string; address: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch copy trades
        const { data: trades, error: tradesError } = await supabase
          .from('copy_trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tradesError) throw tradesError;
        setCopyTrades((trades || []) as CopyTrade[]);

        // Fetch wallets for names
        const { data: walletsData, error: walletsError } = await supabase
          .from('wallets')
          .select('id, name, address')
          .eq('user_id', user.id);

        if (walletsError) throw walletsError;
        
        const walletMap = new Map<string, { name: string; address: string }>();
        (walletsData || []).forEach(w => {
          walletMap.set(w.id, { name: w.name || 'Unknown', address: w.address });
        });
        setWallets(walletMap);
      } catch (err) {
        console.error('Error fetching copy trading stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel('copy-trades-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'copy_trades',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = copyTrades.length;
    const successful = copyTrades.filter(t => t.status === 'completed').length;
    const failed = copyTrades.filter(t => t.status === 'failed').length;
    const pending = copyTrades.filter(t => t.status === 'executing' || t.status === 'pending').length;
    
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    const totalVolume = copyTrades
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.executed_amount_sol || 0), 0);

    const buys = copyTrades.filter(t => t.trade_type === 'buy' && t.status === 'completed').length;
    const sells = copyTrades.filter(t => t.trade_type === 'sell' && t.status === 'completed').length;

    return { total, successful, failed, pending, successRate, totalVolume, buys, sells };
  }, [copyTrades]);

  // Calculate best wallets
  const topWallets = useMemo(() => {
    const walletStatsMap = new Map<string, WalletStats>();

    copyTrades.forEach(trade => {
      if (!trade.source_wallet_id) return;

      const existing = walletStatsMap.get(trade.source_wallet_id);
      const walletInfo = wallets.get(trade.source_wallet_id);
      
      if (existing) {
        existing.totalTrades++;
        if (trade.status === 'completed') {
          existing.successfulTrades++;
          existing.totalVolume += trade.executed_amount_sol || 0;
        }
        existing.successRate = (existing.successfulTrades / existing.totalTrades) * 100;
      } else {
        walletStatsMap.set(trade.source_wallet_id, {
          walletId: trade.source_wallet_id,
          walletName: walletInfo?.name || 'Unknown',
          walletAddress: walletInfo?.address || '',
          totalTrades: 1,
          successfulTrades: trade.status === 'completed' ? 1 : 0,
          successRate: trade.status === 'completed' ? 100 : 0,
          totalVolume: trade.status === 'completed' ? (trade.executed_amount_sol || 0) : 0,
        });
      }
    });

    return Array.from(walletStatsMap.values())
      .sort((a, b) => b.successRate - a.successRate || b.totalTrades - a.totalTrades)
      .slice(0, 5);
  }, [copyTrades, wallets]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (copyTrades.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nessun copy trade ancora.<br />
            Attiva il copy trading e aggiungi wallet da seguire.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Trade Totali</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {stats.buys} buy
              </Badge>
              <Badge variant="outline" className="text-xs">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                {stats.sells} sell
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasso Successo</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
              <div className={`p-2 rounded-lg ${stats.successRate >= 70 ? 'bg-success/10' : stats.successRate >= 50 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                <Target className={`h-5 w-5 ${stats.successRate >= 70 ? 'text-success' : stats.successRate >= 50 ? 'text-warning' : 'text-destructive'}`} />
              </div>
            </div>
            <Progress value={stats.successRate} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.successful}/{stats.total} completati
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Volume Totale</p>
                <p className="text-2xl font-bold">{stats.totalVolume.toFixed(3)}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">SOL eseguiti</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Falliti</p>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.pending > 0 ? `${stats.pending} in corso` : 'Nessuno in corso'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Wallets */}
      {topWallets.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" />
              <CardTitle className="text-base">Migliori Wallet da Copiare</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topWallets.map((wallet, index) => (
                <div
                  key={wallet.walletId}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-warning/20 text-warning' :
                      index === 1 ? 'bg-muted text-muted-foreground' :
                      index === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-muted/50 text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{wallet.walletName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{wallet.successRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">success rate</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{wallet.totalTrades}</p>
                      <p className="text-xs text-muted-foreground">trades</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{wallet.totalVolume.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">SOL</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

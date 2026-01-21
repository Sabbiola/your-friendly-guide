import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  Target,
  ShieldOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Position {
  id: string;
  token_mint: string;
  token_symbol: string;
  amount: number;
  avg_buy_price: number | null;
  entry_price: number | null;
  current_price: number | null;
  unrealized_pnl_sol: number | null;
  unrealized_pnl_percent: number | null;
  stop_loss_percent: number | null;
  take_profit_percent: number | null;
  source: string | null;
  is_open: boolean;
  created_at: string;
}

export function ScannerPositions() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellingId, setSellingId] = useState<string | null>(null);

  const loadPositions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_open', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading positions:', error);
      return;
    }

    setPositions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPositions();

    // Set up realtime subscription
    const channel = supabase
      .channel('positions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadPositions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadPositions]);

  const handleSell = async (position: Position, percent: number) => {
    if (!user) return;

    setSellingId(position.id);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('scanner-trade', {
        body: {
          tokenMint: position.token_mint,
          tokenSymbol: position.token_symbol,
          tokenName: position.token_symbol,
          action: 'sell',
          sellPercent: percent,
          slippage: 12,
          priceUsd: position.current_price || 0,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (error) throw error;

      toast.success(`Sold ${percent}% of ${position.token_symbol}`);
      loadPositions();
    } catch (error) {
      console.error('Sell error:', error);
      toast.error('Failed to execute sell');
    } finally {
      setSellingId(null);
    }
  };

  const formatNumber = (num: number | null, decimals = 2) => {
    if (num === null || num === undefined) return '-';
    if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const formatPrice = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    if (num < 0.000001) return num.toExponential(2);
    if (num < 0.01) return num.toFixed(6);
    return num.toFixed(4);
  };

  if (loading) {
    return (
      <Card className="glass-card p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-4">Loading positions...</p>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card className="glass-card p-12 text-center">
        <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nessuna posizione aperta</h3>
        <p className="text-muted-foreground">
          Acquista token dallo scanner per vedere le tue posizioni qui
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {positions.map((position) => {
        const pnlPercent = position.unrealized_pnl_percent || 0;
        const isPositive = pnlPercent >= 0;
        const stopLoss = position.stop_loss_percent || 10;
        const takeProfit = position.take_profit_percent || 50;
        
        // Calculate progress towards SL/TP
        const slProgress = pnlPercent < 0 ? Math.min(100, (Math.abs(pnlPercent) / stopLoss) * 100) : 0;
        const tpProgress = pnlPercent > 0 ? Math.min(100, (pnlPercent / takeProfit) * 100) : 0;

        return (
          <Card key={position.id} className="glass-card p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                  <span className="font-bold text-sm">{position.token_symbol?.slice(0, 2)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{position.token_symbol}</h3>
                    {position.source && (
                      <Badge variant="outline" className="text-xs">
                        {position.source}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {position.token_mint.slice(0, 8)}...{position.token_mint.slice(-8)}
                  </p>
                </div>
              </div>

              {/* PnL Badge */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-lg font-bold",
                isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              )}>
                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
                <p className="font-semibold font-mono">${formatPrice(position.entry_price)}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="font-semibold font-mono">${formatPrice(position.current_price)}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="font-semibold">{formatNumber(position.amount)} tokens</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">PnL (SOL)</p>
                <p className={cn(
                  "font-semibold",
                  isPositive ? "text-primary" : "text-destructive"
                )}>
                  {isPositive ? '+' : ''}{formatNumber(position.unrealized_pnl_sol, 4)} SOL
                </p>
              </div>
            </div>

            {/* SL/TP Progress */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-destructive">
                    <ShieldOff className="w-4 h-4" />
                    <span className="text-xs font-medium">Stop Loss</span>
                  </div>
                  <span className="text-xs font-mono">-{stopLoss}%</span>
                </div>
                <Progress value={slProgress} className="h-2 bg-destructive/20" />
              </div>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-primary">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-medium">Take Profit</span>
                  </div>
                  <span className="text-xs font-mono">+{takeProfit}%</span>
                </div>
                <Progress value={tpProgress} className="h-2" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSell(position, 25)}
                disabled={sellingId === position.id}
              >
                Sell 25%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSell(position, 50)}
                disabled={sellingId === position.id}
              >
                Sell 50%
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleSell(position, 100)}
                disabled={sellingId === position.id}
              >
                {sellingId === position.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Sell All
              </Button>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(`https://dexscreener.com/solana/${position.token_mint}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
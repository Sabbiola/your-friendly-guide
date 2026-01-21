import { TradeRow } from "./TradeRow";
import { useWalletContext } from "@/contexts/WalletContext";
import { Loader2, Activity } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export function RecentActivity() {
  const { trades, transactionsLoading, walletAddress } = useWalletContext();
  const navigate = useNavigate();

  const recentTrades = useMemo(() => {
    if (!trades.length) return [];
    
    // Calculate PnL by matching buys and sells for same token
    const tokenStats: Map<string, { totalBuy: number; totalSell: number }> = new Map();
    
    for (const trade of trades) {
      const stats = tokenStats.get(trade.tokenMint) || { totalBuy: 0, totalSell: 0 };
      if (trade.type === 'buy') {
        stats.totalBuy += trade.solAmount;
      } else {
        stats.totalSell += trade.solAmount;
      }
      tokenStats.set(trade.tokenMint, stats);
    }
    
    return trades.slice(0, 5).map(trade => {
      const now = Date.now();
      const tradeTime = trade.blockTime * 1000;
      const diffMs = now - tradeTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      let timeAgo = '';
      if (diffMins < 60) {
        timeAgo = `${diffMins} min fa`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours}h fa`;
      } else {
        timeAgo = `${diffDays}g fa`;
      }

      // Calculate actual PnL for sell trades
      let pnl: number | undefined;
      if (trade.type === 'sell') {
        const stats = tokenStats.get(trade.tokenMint);
        if (stats && stats.totalBuy > 0) {
          // Simple PnL: sell amount - proportional buy amount
          const ratio = trade.solAmount / (stats.totalSell || trade.solAmount);
          pnl = trade.solAmount - (stats.totalBuy * ratio);
        }
      }

      return {
        token: trade.tokenMint,
        tokenSymbol: trade.tokenSymbol,
        type: trade.type as 'buy' | 'sell',
        amount: trade.solAmount,
        price: trade.priceUsd || 0,
        time: timeAgo,
        platform: trade.platform as 'jupiter' | 'pumpfun' | 'raydium' | 'unknown',
        txHash: trade.signature,
        pnl,
      };
    });
  }, [trades]);

  if (!walletAddress) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-semibold">Attività Recente</h3>
        </div>
        <div className="p-8 text-center">
          <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Inserisci un wallet per vedere l'attività</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold">Attività Recente</h3>
          {transactionsLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <button 
          className="text-xs text-primary hover:underline"
          onClick={() => navigate('/trades')}
        >
          Vedi tutti
        </button>
      </div>
      
      {transactionsLoading && recentTrades.length === 0 ? (
        <div className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      ) : recentTrades.length === 0 ? (
        <div className="p-8 text-center">
          <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Nessun trade trovato</p>
          <p className="text-xs text-muted-foreground mt-1">I trade appariranno qui</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {recentTrades.map((trade, index) => (
            <TradeRow key={index} {...trade} />
          ))}
        </div>
      )}
    </div>
  );
}

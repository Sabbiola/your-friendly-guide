import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ParsedSwap {
  signature: string;
  blockTime: number;
  type: 'buy' | 'sell';
  tokenMint: string;
  tokenSymbol: string;
  tokenAmount: number;
  solAmount: number;
  priceUsd: number | null;
  platform: 'jupiter' | 'raydium' | 'pumpfun' | 'unknown';
}

export interface TransactionSummary {
  totalTrades: number;
  totalBuys: number;
  totalSells: number;
  totalPnlSol: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
}

export interface WalletTransactionsData {
  trades: ParsedSwap[];
  summary: TransactionSummary;
}

export function useWalletTransactions() {
  const [data, setData] = useState<WalletTransactionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (walletAddress: string, limit = 100) => {
    if (!walletAddress) {
      setError('Indirizzo wallet richiesto');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'wallet-transactions',
        {
          method: 'POST',
          body: { walletAddress, limit }
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Errore nel recupero transazioni');
      }

      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('Error fetching wallet transactions:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTradesToday = useCallback(() => {
    if (!data?.trades) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime() / 1000;
    
    return data.trades.filter(t => t.blockTime >= todayTimestamp).length;
  }, [data]);

  const getTradesThisWeek = useCallback(() => {
    if (!data?.trades) return [];
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoTimestamp = weekAgo.getTime() / 1000;
    
    return data.trades.filter(t => t.blockTime >= weekAgoTimestamp);
  }, [data]);

  const getTopTokensByPnL = useCallback(() => {
    if (!data?.trades) return [];
    
    // Group by token
    const tokenStats: Map<string, { symbol: string; pnl: number; trades: number }> = new Map();
    
    for (const trade of data.trades) {
      const existing = tokenStats.get(trade.tokenMint) || { 
        symbol: trade.tokenSymbol, 
        pnl: 0, 
        trades: 0 
      };
      
      // Simplified PnL: positive for sells, negative for buys
      const pnlChange = trade.type === 'sell' ? trade.solAmount : -trade.solAmount;
      existing.pnl += pnlChange;
      existing.trades++;
      
      tokenStats.set(trade.tokenMint, existing);
    }
    
    return Array.from(tokenStats.entries())
      .map(([mint, stats]) => ({ mint, ...stats }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10);
  }, [data]);

  const getPlatformDistribution = useCallback(() => {
    if (!data?.trades) return [];
    
    const platforms: Map<string, number> = new Map();
    
    for (const trade of data.trades) {
      const count = platforms.get(trade.platform) || 0;
      platforms.set(trade.platform, count + 1);
    }
    
    const total = data.trades.length;
    return Array.from(platforms.entries()).map(([name, count]) => ({
      name: name === 'jupiter' ? 'Jupiter' : 
            name === 'raydium' ? 'Raydium' : 
            name === 'pumpfun' ? 'Pump.fun' : 'Altro',
      value: Math.round((count / total) * 100),
      count,
    }));
  }, [data]);

  const getDailyPnL = useCallback(() => {
    if (!data?.trades) return [];
    
    // Group trades by day
    const dailyPnL: Map<string, number> = new Map();
    
    for (const trade of data.trades) {
      const date = new Date(trade.blockTime * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      const existing = dailyPnL.get(dateKey) || 0;
      const pnlChange = trade.type === 'sell' ? trade.solAmount : -trade.solAmount;
      dailyPnL.set(dateKey, existing + pnlChange);
    }
    
    // Sort by date and return last 30 days
    return Array.from(dailyPnL.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, pnl]) => ({ date, pnl }));
  }, [data]);

  return {
    data,
    trades: data?.trades || [],
    summary: data?.summary || null,
    isLoading,
    error,
    fetchTransactions,
    getTradesToday,
    getTradesThisWeek,
    getTopTokensByPnL,
    getPlatformDistribution,
    getDailyPnL,
  };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TokenAnalysis {
  mint: string;
  name: string | null;
  symbol: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
  priceChange24h: number | null;
  supply: number | null;
  holders: number | null;
  devHoldings: number | null;
  txCount24h: number | null;
  buys24h: number | null;
  sells24h: number | null;
  createdAt: string | null;
  pairAddress: string | null;
  dexId: string | null;
}

export function useTokenAnalysis() {
  const [tokenData, setTokenData] = useState<TokenAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeToken = useCallback(async (mint: string) => {
    if (!mint) {
      setError('Token mint address richiesto');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('token-analysis', {
        body: { mint }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Errore analisi token');
      }

      setTokenData(data);
      return data as TokenAnalysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('Token analysis error:', message);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearToken = useCallback(() => {
    setTokenData(null);
    setError(null);
  }, []);

  return {
    tokenData,
    isLoading,
    error,
    analyzeToken,
    clearToken,
  };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Holder {
  address: string;
  balance: number;
  percentage: number;
  label?: string;
}

export interface TokenHoldersData {
  mint: string;
  totalHolders: number | null;
  topHolders: Holder[];
  devWallet: Holder | null;
  top10Percentage: number | null;
  top20Percentage: number | null;
}

export function useTokenHolders() {
  const [data, setData] = useState<TokenHoldersData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHolders = useCallback(async (mint: string) => {
    if (!mint) {
      setError('Token mint richiesto');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke('token-holders', {
        body: { mint }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Errore fetch holders');
      }

      setData(response);
      return response as TokenHoldersData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('Token holders error:', message);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearHolders = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchHolders,
    clearHolders,
  };
}

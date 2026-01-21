import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TokenAccount {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  uiAmount: number;
}

export interface WalletData {
  address: string;
  balanceSol: number;
  tokens: TokenAccount[];
}

export function useSolanaWallet(walletAddress: string | null) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    if (!walletAddress) {
      setWalletData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use edge function to proxy Solana RPC calls
      const { data, error: fnError } = await supabase.functions.invoke('solana-wallet', {
        body: { address: walletAddress },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setWalletData({
        address: walletAddress,
        balanceSol: data.balanceSol,
        tokens: data.tokens,
      });
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'Errore nel recupero dati wallet');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchWalletData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchWalletData, 30000);
    return () => clearInterval(interval);
  }, [fetchWalletData]);

  return { walletData, isLoading, error, refetch: fetchWalletData };
}

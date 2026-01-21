import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WalletTrade {
  signature: string;
  blockTime: number;
  type: 'buy' | 'sell';
  tokenMint: string;
  tokenSymbol: string;
  tokenAmount: number;
  solAmount: number;
  platform: string;
}

export function useWalletScanner() {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanWallet = useCallback(async (walletAddress: string) => {
    if (!walletAddress) {
      setError('Wallet address richiesto');
      return null;
    }

    setIsScanning(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('wallet-scanner', {
        body: { 
          walletAddress,
          userId: user?.id,
        }
      });

      if (fnError) throw new Error(fnError.message);
      
      setLastScan(new Date());
      return data as { success: boolean; trades: WalletTrade[]; count: number };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('Wallet scanner error:', message);
      setError(message);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [user?.id]);

  return {
    scanWallet,
    isScanning,
    lastScan,
    error,
  };
}

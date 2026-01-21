import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TokenPrice {
  mint: string;
  symbol: string;
  price: number;
  change24h?: number;
  priceHistory: { price: number; time: string }[];
}

export function useTokenPrices(tokenMints: string[]) {
  const [tokenPrices, setTokenPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (tokenMints.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const mintsParam = tokenMints.join(',');
      
      // Use edge function to proxy Jupiter API with POST body
      const { data, error: fnError } = await supabase.functions.invoke(
        'token-prices',
        { 
          method: 'POST',
          body: { mints: mintsParam }
        }
      );

      // Fallback to direct API if edge function fails
      let priceData = data;
      if (fnError) {
        console.warn('Edge function failed, trying direct API:', fnError);
        const response = await fetch(
          `https://api.jup.ag/price/v2?ids=${mintsParam}`
        );
        priceData = await response.json();
      }
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      setTokenPrices(prev => {
        const newMap = new Map(prev);
        
        for (const mint of tokenMints) {
          if (priceData?.data?.[mint]) {
            const tokenData = priceData.data[mint];
            const price = parseFloat(tokenData.price);
            const existing = newMap.get(mint);
            
            const priceHistory = existing?.priceHistory || [];
            const newHistory = [...priceHistory, { price, time: timeStr }].slice(-30);
            
            newMap.set(mint, {
              mint,
              symbol: tokenData.mintSymbol || mint.slice(0, 4),
              price,
              priceHistory: newHistory,
            });
          }
        }
        
        return newMap;
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching token prices:', err);
      setError('Errore nel recupero prezzi token');
    } finally {
      setIsLoading(false);
    }
  }, [tokenMints]);

  useEffect(() => {
    fetchPrices();
    
    // Aggiorna ogni 15 secondi
    const interval = setInterval(fetchPrices, 15000);
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return { tokenPrices, isLoading, error, refetch: fetchPrices };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: number;
}

interface PriceHistory {
  price: number;
  time: string;
}

export function useSolPrice() {
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('sol-price');
      
      if (fnError) throw new Error(fnError.message);
      
      if (data && data.price) {
        setCurrentPrice({
          price: data.price,
          change24h: data.change24h || 0,
          volume24h: data.volume24h || 0,
          marketCap: data.marketCap || 0,
          timestamp: Date.now(),
        });

        const now = new Date();
        const timeStr = now.toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        setPriceHistory(prev => {
          const newHistory = [...prev, { price: data.price, time: timeStr }];
          return newHistory.slice(-30);
        });
        
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching SOL price:', err);
      setError('Errore nel recupero prezzo SOL');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { currentPrice, priceHistory, isLoading, error, refetch: fetchPrice };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function useTokenChart() {
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(async (mint: string, interval = '15m') => {
    if (!mint) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('token-chart', {
        body: { mint, interval }
      });

      if (fnError) throw new Error(fnError.message);
      
      setChartData(data?.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('Token chart error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { chartData, isLoading, error, fetchChart };
}

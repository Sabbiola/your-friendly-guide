import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface PricePoint {
  price: number;
  time: string;
}

interface PositionMiniChartProps {
  tokenMint: string;
  isProfit: boolean;
}

export function PositionMiniChart({ tokenMint, isProfit }: PositionMiniChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPriceHistory = useCallback(async () => {
    try {
      // Fetch current price from Jupiter
      const response = await fetch(
        `https://api.jup.ag/price/v2?ids=${tokenMint}`
      );
      const data = await response.json();
      
      if (data?.data?.[tokenMint]) {
        const price = parseFloat(data.data[tokenMint].price);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('it-IT', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        setPriceHistory(prev => {
          const newHistory = [...prev, { price, time: timeStr }];
          // Keep last 20 data points
          return newHistory.slice(-20);
        });
      }
    } catch (err) {
      console.error('Error fetching price for chart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenMint]);

  useEffect(() => {
    // Generate initial mock data based on random walk
    const initialData: PricePoint[] = [];
    let basePrice = Math.random() * 0.001 + 0.0001;
    
    for (let i = 0; i < 15; i++) {
      const change = (Math.random() - 0.5) * 0.0001;
      basePrice = Math.max(0.00001, basePrice + change);
      initialData.push({
        price: basePrice,
        time: `${i}m`,
      });
    }
    
    setPriceHistory(initialData);
    setIsLoading(false);

    // Fetch real price and update
    fetchPriceHistory();
    
    // Update every 30 seconds
    const interval = setInterval(fetchPriceHistory, 30000);
    return () => clearInterval(interval);
  }, [fetchPriceHistory]);

  if (isLoading || priceHistory.length < 2) {
    return (
      <div className="w-full h-full bg-muted/30 rounded animate-pulse" />
    );
  }

  const strokeColor = isProfit ? 'hsl(var(--success))' : 'hsl(var(--destructive))';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={priceHistory}>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Line
          type="monotone"
          dataKey="price"
          stroke={strokeColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

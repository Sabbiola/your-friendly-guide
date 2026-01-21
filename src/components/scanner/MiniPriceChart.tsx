import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface MiniPriceChartProps {
  priceChange5m: number | null;
  priceChange1h: number | null;
  priceChange24h: number | null;
  className?: string;
}

export function MiniPriceChart({ 
  priceChange5m, 
  priceChange1h, 
  priceChange24h,
  className 
}: MiniPriceChartProps) {
  // Generate synthetic price trend data based on price changes
  const chartData = useMemo(() => {
    const basePrice = 100;
    const p24h = basePrice * (1 - (priceChange24h ?? 0) / 100);
    const p1h = basePrice * (1 - (priceChange1h ?? 0) / 100);
    const p5m = basePrice * (1 - (priceChange5m ?? 0) / 100);
    const pNow = basePrice;

    // Create interpolated points for smoother curve
    const points = [
      { time: 0, price: p24h },
      { time: 1, price: p24h + (p1h - p24h) * 0.2 },
      { time: 2, price: p24h + (p1h - p24h) * 0.5 },
      { time: 3, price: p24h + (p1h - p24h) * 0.8 },
      { time: 4, price: p1h },
      { time: 5, price: p1h + (p5m - p1h) * 0.3 },
      { time: 6, price: p1h + (p5m - p1h) * 0.6 },
      { time: 7, price: p5m },
      { time: 8, price: p5m + (pNow - p5m) * 0.5 },
      { time: 9, price: pNow },
    ];

    return points;
  }, [priceChange5m, priceChange1h, priceChange24h]);

  const isPositive = (priceChange5m ?? 0) >= 0;
  const strokeColor = isPositive ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';
  const fillColor = isPositive ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--destructive) / 0.2)';

  return (
    <div className={cn("h-10 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`miniGradient-${isPositive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#miniGradient-${isPositive ? 'up' : 'down'})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

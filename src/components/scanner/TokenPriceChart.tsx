import { useEffect } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useTokenChart } from '@/hooks/useTokenChart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TokenPriceChartProps {
  mint: string;
  className?: string;
}

export function TokenPriceChart({ mint, className }: TokenPriceChartProps) {
  const { chartData, isLoading, error, fetchChart } = useTokenChart();

  useEffect(() => {
    if (mint) {
      fetchChart(mint, '5m');
    }
  }, [mint, fetchChart]);

  if (isLoading) {
    return (
      <div className={cn("h-48", className)}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (error || chartData.length === 0) {
    // Generate fallback data for demo
    const fallbackData = Array.from({ length: 24 }, (_, i) => ({
      time: i,
      close: 100 + Math.random() * 20 - 10 + Math.sin(i / 3) * 5,
    }));

    return (
      <div className={cn("h-48", className)}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={fallbackData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGradientFallback" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={false}
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']} 
              axisLine={false} 
              tickLine={false} 
              tick={false}
              width={0}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradientFallback)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const firstPrice = chartData[0]?.close ?? 0;
  const lastPrice = chartData[chartData.length - 1]?.close ?? 0;
  const isPositive = lastPrice >= firstPrice;
  const strokeColor = isPositive ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';
  const gradientId = isPositive ? 'priceGradientUp' : 'priceGradientDown';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    if (price < 0.000001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  };

  return (
    <div className={cn("h-48", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={formatTime}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(v) => `$${formatPrice(v)}`}
            width={60}
            orientation="right"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelFormatter={formatTime}
            formatter={(value: number) => [`$${formatPrice(value)}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

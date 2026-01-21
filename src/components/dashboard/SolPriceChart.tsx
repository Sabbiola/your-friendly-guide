import { useSolPrice } from "@/hooks/useSolPrice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SolPriceChart() {
  const { currentPrice, priceHistory, isLoading, error, refetch } = useSolPrice();

  if (isLoading && priceHistory.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const averagePrice = priceHistory.length > 0 
    ? priceHistory.reduce((acc, p) => acc + p.price, 0) / priceHistory.length 
    : 0;
  
  const isUp = currentPrice && priceHistory.length > 1 
    ? currentPrice.price >= priceHistory[0].price 
    : true;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">SOL</span>
            </div>
            <div>
              <CardTitle className="text-lg font-display">Solana</CardTitle>
              <p className="text-xs text-muted-foreground">Live Price</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold">
              ${currentPrice?.price.toFixed(2) || '---'}
            </p>
            <div className={cn(
              "flex items-center gap-1 text-sm",
              isUp ? "text-success" : "text-destructive"
            )}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {priceHistory.length > 1 
                  ? `${isUp ? '+' : ''}${((currentPrice?.price || 0) - priceHistory[0].price).toFixed(2)}` 
                  : '---'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="h-[180px] flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Riprova
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={priceHistory}>
              <defs>
                <linearGradient id="solGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={50}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Tooltip 
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Prezzo']}
              />
              <ReferenceLine 
                y={averagePrice} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3"
                strokeOpacity={0.3}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT')}</span>
          <Button variant="ghost" size="sm" onClick={refetch} className="h-6 px-2 gap-1">
            <RefreshCw className="w-3 h-3" />
            Aggiorna
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

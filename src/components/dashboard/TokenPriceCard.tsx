import { 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenPriceCardProps {
  symbol: string;
  mint: string;
  price: number;
  priceHistory: { price: number; time: string }[];
  balance?: number;
  pnl?: number;
}

export function TokenPriceCard({ 
  symbol, 
  mint, 
  price, 
  priceHistory, 
  balance = 0,
  pnl = 0 
}: TokenPriceCardProps) {
  const isUp = priceHistory.length > 1 
    ? price >= priceHistory[0].price 
    : true;
  
  const priceChange = priceHistory.length > 1
    ? ((price - priceHistory[0].price) / priceHistory[0].price) * 100
    : 0;

  const shortMint = `${mint.slice(0, 4)}...${mint.slice(-4)}`;
  const value = balance * price;

  return (
    <div className="glass-card p-4 hover:border-primary/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            <span className="font-display font-bold text-xs">{symbol.slice(0, 2)}</span>
          </div>
          <div>
            <p className="font-medium text-sm">{symbol}</p>
            <a 
              href={`https://solscan.io/token/${mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {shortMint}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display font-bold text-sm">
            ${price < 0.01 ? price.toExponential(2) : price.toFixed(4)}
          </p>
          <div className={cn(
            "flex items-center justify-end gap-1 text-xs",
            isUp ? "text-success" : "text-destructive"
          )}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-12 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceHistory.slice(-15)}>
            <Tooltip 
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px',
              }}
              formatter={(value: number) => [
                `$${value < 0.01 ? value.toExponential(2) : value.toFixed(4)}`, 
                'Prezzo'
              ]}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Balance & PnL */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
        <div>
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="font-mono text-sm">{balance.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Valore</p>
          <p className={cn(
            "font-display font-bold text-sm",
            pnl >= 0 ? "text-success" : "text-destructive"
          )}>
            ${value.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { ExternalLink, ArrowUpRight, ArrowDownRight, Eye } from "lucide-react";
import { TokenDetailModal } from '@/components/token/TokenDetailModal';

export interface TradeRowProps {
  token: string;
  tokenSymbol: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  pnl?: number;
  time: string;
  platform: "jupiter" | "pumpfun" | "raydium" | "unknown";
  txHash: string;
}

export function TradeRow({ token, tokenSymbol, type, amount, price, pnl, time, platform, txHash }: TradeRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isBuy = type === "buy";
  const isProfit = pnl !== undefined && pnl >= 0;

  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 hover:bg-secondary/30 rounded-lg transition-colors">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isBuy ? "bg-success/10" : "bg-destructive/10"
          )}>
            {isBuy ? (
              <ArrowUpRight className="w-4 h-4 text-success" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDetails(true)}
                className="font-medium text-sm hover:text-primary transition-colors"
              >
                {tokenSymbol}
              </button>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                isBuy ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {isBuy ? "BUY" : "SELL"}
              </span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded bg-secondary",
                platform === "jupiter" ? "text-chart-4" : 
                platform === "raydium" ? "text-warning" : "text-accent"
              )}>
                {platform === "jupiter" ? "Jupiter" : 
                 platform === "raydium" ? "Raydium" : 
                 platform === "pumpfun" ? "Pump.fun" : "DEX"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
              {token}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-display font-medium text-sm">{amount.toFixed(4)} SOL</p>
            <p className="text-xs text-muted-foreground">${(amount * price).toFixed(2)}</p>
          </div>

          {pnl !== undefined && (
            <div className={cn(
              "text-right min-w-[80px]",
              isProfit ? "text-success" : "text-destructive"
            )}>
              <p className="font-display font-medium text-sm">
                {isProfit ? "+" : ""}{pnl.toFixed(4)} SOL
              </p>
              <p className="text-xs">
                {isProfit ? "+" : ""}{((pnl / amount) * 100).toFixed(1)}%
              </p>
            </div>
          )}

          <div className="text-right min-w-[80px]">
            <p className="text-sm text-muted-foreground">{time}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDetails(true)}
              className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title="Vedi dettagli token"
            >
              <Eye className="w-4 h-4" />
            </button>
            <a
              href={`https://solscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <TokenDetailModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        tokenMint={token}
        tokenSymbol={tokenSymbol}
      />
    </>
  );
}

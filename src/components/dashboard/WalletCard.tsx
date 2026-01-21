import { ExternalLink, Copy, MoreVertical, TrendingUp, Pause, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WalletCardProps {
  address: string;
  label: string;
  pnl: number;
  winRate: number;
  tradesCount: number;
  isActive?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}

export function WalletCard({ 
  address, 
  label, 
  pnl, 
  winRate, 
  tradesCount, 
  isActive = true,
  onToggle,
  onRemove,
}: WalletCardProps) {
  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
  const isProfit = pnl >= 0;

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Indirizzo copiato!");
  };

  return (
    <div className={cn(
      "glass-card p-4 transition-all duration-300 hover:border-primary/30",
      isActive && "border-l-2 border-l-primary"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <span className="font-display font-bold text-sm">{label.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-mono text-xs">{shortAddress}</span>
              <button onClick={copyAddress} className="hover:text-foreground transition-colors">
                <Copy className="w-3 h-3" />
              </button>
              <a
                href={`https://solscan.io/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onToggle && (
              <DropdownMenuItem onClick={onToggle}>
                {isActive ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pausa
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Attiva
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onRemove && (
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Rimuovi
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground mb-1">PnL</p>
          <p className={cn(
            "font-display font-bold text-sm",
            isProfit ? "text-success" : "text-destructive"
          )}>
            {isProfit ? "+" : ""}{pnl.toFixed(2)} SOL
          </p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
          <p className="font-display font-bold text-sm">{winRate}%</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground mb-1">Trade</p>
          <p className="font-display font-bold text-sm">{tradesCount}</p>
        </div>
      </div>

      {isActive && (
        <div className="mt-3 flex items-center gap-2 text-xs text-primary">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Attivo
        </div>
      )}
    </div>
  );
}

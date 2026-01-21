import { TokenAnalysis } from '@/hooks/useTokenAnalysis';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  Droplets,
  Clock,
  ArrowUpDown,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TokenAnalysisCardProps {
  token: TokenAnalysis | null;
  isLoading?: boolean;
}

function formatNumber(num: number | null, decimals = 2): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
  return num.toFixed(decimals);
}

function formatPrice(price: number | null): string {
  if (price === null) return 'N/A';
  if (price < 0.00001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function StatItem({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  isLoading 
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  trend?: 'up' | 'down' | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        trend === 'up' ? 'bg-success/20 text-success' :
        trend === 'down' ? 'bg-destructive/20 text-destructive' :
        'bg-muted text-muted-foreground'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-semibold truncate ${
          trend === 'up' ? 'text-success' :
          trend === 'down' ? 'text-destructive' :
          'text-foreground'
        }`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function TokenAnalysisCard({ token, isLoading }: TokenAnalysisCardProps) {
  const [copied, setCopied] = useState(false);

  const copyMint = () => {
    if (token?.mint) {
      navigator.clipboard.writeText(token.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[...Array(8)].map((_, i) => (
            <StatItem key={i} label="" value="" icon={Activity} isLoading />
          ))}
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="glass-card p-6 text-center">
        <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          Inserisci un token address per vedere l'analisi dettagliata
        </p>
      </div>
    );
  }

  const priceChange = token.priceChange24h;
  const priceTrend = priceChange && priceChange > 0 ? 'up' : priceChange && priceChange < 0 ? 'down' : null;
  const buysSells = token.buys24h && token.sells24h 
    ? token.buys24h - token.sells24h 
    : null;
  const buysSellsTrend = buysSells && buysSells > 0 ? 'up' : buysSells && buysSells < 0 ? 'down' : null;

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
            <span className="text-lg font-bold text-primary">
              {token.symbol?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{token.name || 'Unknown'}</h3>
            <p className="text-xs text-muted-foreground">{token.symbol || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyMint}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            title="Copia mint address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <a
            href={`https://solscan.io/token/${token.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            title="Vedi su Solscan"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Price Section */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-background to-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Prezzo</p>
            <p className="text-2xl font-bold">{formatPrice(token.priceUsd)}</p>
          </div>
          {priceChange !== null && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
              priceTrend === 'up' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
            }`}>
              {priceTrend === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem
          label="Market Cap"
          value={`$${formatNumber(token.marketCap)}`}
          icon={DollarSign}
        />
        <StatItem
          label="Volume 24h"
          value={`$${formatNumber(token.volume24h)}`}
          icon={Activity}
        />
        <StatItem
          label="Liquidità"
          value={`$${formatNumber(token.liquidity)}`}
          icon={Droplets}
        />
        <StatItem
          label="Holders"
          value={token.holders ? formatNumber(token.holders, 0) : 'N/A'}
          icon={Users}
        />
        <StatItem
          label="TX 24h"
          value={token.txCount24h ? formatNumber(token.txCount24h, 0) : 'N/A'}
          icon={ArrowUpDown}
        />
        <StatItem
          label="Buy/Sell 24h"
          value={`${token.buys24h || 0} / ${token.sells24h || 0}`}
          icon={priceTrend === 'up' ? TrendingUp : TrendingDown}
          trend={buysSellsTrend}
        />
        <StatItem
          label="Dev Holdings"
          value={token.devHoldings ? `${token.devHoldings.toFixed(1)}%` : 'N/A'}
          icon={Users}
          trend={token.devHoldings && token.devHoldings > 10 ? 'down' : null}
        />
        <StatItem
          label="Creato"
          value={token.createdAt ? new Date(token.createdAt).toLocaleDateString('it-IT') : 'N/A'}
          icon={Clock}
        />
      </div>

      {/* DEX Info */}
      {token.dexId && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground">Exchange</span>
          <span className="text-xs font-medium capitalize">{token.dexId}</span>
        </div>
      )}
    </div>
  );
}

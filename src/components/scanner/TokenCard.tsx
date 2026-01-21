import { useState } from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Clock, Users, BarChart3, Zap, Shield, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ScannedToken } from '@/hooks/usePumpfunScanner';
import { TokenTradeModal } from './TokenTradeModal';
import { MiniPriceChart } from './MiniPriceChart';

interface TokenCardProps {
  token: ScannedToken;
}

export function TokenCard({ token }: TokenCardProps) {
  const [showTradeModal, setShowTradeModal] = useState(false);

  const formatNumber = (num: number | null, decimals = 2) => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatPrice = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    if (num < 0.000001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    return `$${num.toFixed(4)}`;
  };

  const formatPercent = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    return `${num.toFixed(1)}%`;
  };

  const getRiskColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score <= 30) return 'bg-primary';
    if (score <= 60) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  const getRiskLabel = (score: number | null) => {
    if (score === null) return 'Unknown';
    if (score <= 30) return 'Low Risk';
    if (score <= 60) return 'Medium';
    return 'High Risk';
  };

  const getDevHoldingColor = (percent: number | null) => {
    if (percent === null) return 'text-muted-foreground';
    if (percent <= 5) return 'text-primary';
    if (percent <= 15) return 'text-yellow-500';
    return 'text-destructive';
  };

  const priceChange = token.priceChange5m ?? 0;
  const isPositive = priceChange >= 0;
  const hasHeliusData = token.holdersCount !== null || token.devHoldingPercent !== null;

  return (
    <>
      <Card
        className={cn(
          "glass-card p-4 hover:border-primary/40 transition-all cursor-pointer group",
          token.isStale && "opacity-60 border-yellow-500/30"
        )}
        onClick={() => setShowTradeModal(true)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {token.imageUrl ? (
              <img
                src={token.imageUrl}
                alt={token.symbol || 'Token'}
                className={cn(
                  "w-10 h-10 rounded-full object-cover bg-background/50",
                  token.isStale && "grayscale"
                )}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center",
              token.imageUrl && "hidden",
              token.isStale && "grayscale"
            )}>
              <span className="font-bold text-sm">{token.symbol?.slice(0, 2)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{token.symbol || 'Unknown'}</h3>
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  <Zap className="w-3 h-3 mr-0.5" />
                  Pump
                </Badge>
                {token.isStale && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 border-yellow-500/50 text-yellow-500">
                          <Clock className="w-3 h-3 mr-0.5" />
                          Stale
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Not in latest scan - may have moved or changed</p>
                        <p className="text-xs text-muted-foreground mt-1">Will be removed after 5 min</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {token.name || 'Unknown Token'}
              </p>
            </div>
          </div>

          {/* Risk Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={cn('text-xs cursor-help', getRiskColor(token.riskScore))}>
                  <Shield className="w-3 h-3 mr-1" />
                  {getRiskLabel(token.riskScore)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Risk Score: {token.riskScore ?? 'N/A'}/100</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lower is better (based on age, volume, holders)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Mini Price Chart */}
        <div className="mb-3">
          <MiniPriceChart
            priceChange5m={token.priceChange5m}
            priceChange1h={token.priceChange1h}
            priceChange24h={token.priceChange24h}
          />
        </div>

        {/* Price & Change */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-lg font-bold">
            {formatPrice(token.priceUsd)}
          </span>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium",
            isPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(priceChange).toFixed(1)}%
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-background/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Market Cap</p>
            <p className="font-semibold text-sm">{formatNumber(token.marketCap)}</p>
          </div>
          <div className="bg-background/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Volume 24h</p>
            <p className="font-semibold text-sm">{formatNumber(token.volume24h)}</p>
          </div>
        </div>

        {/* Helius On-Chain Data */}
        {hasHeliusData && (
          <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-primary/5 rounded-lg border border-primary/10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <p className="text-xs text-muted-foreground">Holders</p>
                    <p className="font-semibold text-sm text-primary">
                      {token.holdersCount ?? '-'}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>On-chain holder count from Helius</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <p className="text-xs text-muted-foreground">Top 10</p>
                    <p className="font-semibold text-sm">
                      {formatPercent(token.top10HoldersPercent)}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Top 10 holders own this % of supply</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help">
                    <p className="text-xs text-muted-foreground">Dev</p>
                    <p className={cn("font-semibold text-sm", getDevHoldingColor(token.devHoldingPercent))}>
                      {formatPercent(token.devHoldingPercent)}
                      {token.devHoldingPercent !== null && token.devHoldingPercent > 15 && (
                        <AlertTriangle className="w-3 h-3 inline ml-1" />
                      )}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Developer/Largest holder %
                  {token.devHoldingPercent !== null && token.devHoldingPercent > 15 && (
                    <p className="text-destructive text-xs">⚠️ High concentration risk</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Bonding Curve Progress */}
        {token.bondingCurvePercent !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Bonding Curve</span>
              <span className="font-medium">{token.bondingCurvePercent.toFixed(1)}%</span>
            </div>
            <Progress value={token.bondingCurvePercent} className="h-2" />
          </div>
        )}

        {/* Bottom Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{token.ageMinutes}m ago</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{token.holdersCount ?? '-'} holders</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            <span>{token.txns24h ?? 0} txns</span>
          </div>
        </div>

        {/* Quick Actions (shown on hover) */}
        <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            className="flex-1 h-8"
            onClick={(e) => {
              e.stopPropagation();
              setShowTradeModal(true);
            }}
          >
            Trade
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://dexscreener.com/solana/${token.pairAddress}`, '_blank');
            }}
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </Card>

      <TokenTradeModal
        token={token}
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
      />
    </>
  );
}
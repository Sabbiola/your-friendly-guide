import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Copy, 
  Shield,
  Clock,
  Users,
  BarChart3,
  DollarSign,
  Percent,
  AlertTriangle,
  Loader2,
  Target,
  ShieldOff,
  LineChart,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScannedToken } from '@/hooks/usePumpfunScanner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TokenPriceChart } from './TokenPriceChart';
import { DexScreenerChart } from './DexScreenerChart';

interface TokenTradeModalProps {
  token: ScannedToken;
  isOpen: boolean;
  onClose: () => void;
}

export function TokenTradeModal({ token, isOpen, onClose }: TokenTradeModalProps) {
  const [buyAmount, setBuyAmount] = useState('0.1');
  const [sellPercent, setSellPercent] = useState(100);
  const [slippage, setSlippage] = useState(12);
  const [stopLoss, setStopLoss] = useState(10);
  const [takeProfit, setTakeProfit] = useState(50);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatNumber = (num: number | null, decimals = 2) => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const formatPrice = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    if (num < 0.000001) return num.toExponential(2);
    if (num < 0.01) return num.toFixed(6);
    return num.toFixed(4);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleBuy = async () => {
    setIsExecuting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('scanner-trade', {
        body: {
          tokenMint: token.mint,
          tokenSymbol: token.symbol || 'UNKNOWN',
          tokenName: token.name || 'Unknown Token',
          action: 'buy',
          amountSol: parseFloat(buyAmount),
          slippage,
          priceUsd: token.priceUsd || 0,
          stopLossPercent: stopLoss,
          takeProfitPercent: takeProfit,
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          <div>
            <p className="font-semibold">Buy order executed!</p>
            <p className="text-sm text-muted-foreground">
              {buyAmount} SOL → {token.symbol}
            </p>
            {data.txSignature && (
              <a 
                href={`https://solscan.io/tx/${data.txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View on Solscan →
              </a>
            )}
          </div>
        );
        onClose();
      } else {
        throw new Error(data?.error || 'Trade failed');
      }
    } catch (error) {
      console.error('Buy error:', error);
      toast.error(`Failed to execute buy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSell = async () => {
    setIsExecuting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('scanner-trade', {
        body: {
          tokenMint: token.mint,
          tokenSymbol: token.symbol || 'UNKNOWN',
          tokenName: token.name || 'Unknown Token',
          action: 'sell',
          sellPercent,
          slippage,
          priceUsd: token.priceUsd || 0,
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          <div>
            <p className="font-semibold">Sell order executed!</p>
            <p className="text-sm text-muted-foreground">
              {sellPercent}% of {token.symbol}
            </p>
            {data.txSignature && (
              <a 
                href={`https://solscan.io/tx/${data.txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View on Solscan →
              </a>
            )}
          </div>
        );
        onClose();
      } else {
        throw new Error(data?.error || 'Trade failed');
      }
    } catch (error) {
      console.error('Sell error:', error);
      toast.error(`Failed to execute sell: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const priceChange = token.priceChange5m ?? 0;
  const isPositive = priceChange >= 0;

  const getRiskColor = (score: number | null) => {
    if (score === null) return 'bg-muted';
    if (score <= 30) return 'bg-primary text-primary-foreground';
    if (score <= 60) return 'bg-yellow-500 text-black';
    return 'bg-destructive text-destructive-foreground';
  };

  const getDevHoldingColor = (percent: number | null) => {
    if (percent === null) return 'text-muted-foreground';
    if (percent <= 5) return 'text-primary';
    if (percent <= 15) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "overflow-hidden flex flex-col transition-all duration-300 p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl",
        isFullscreen 
          ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none m-0" 
          : "max-w-xl max-h-[90vh] rounded-xl"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {token.imageUrl ? (
              <img 
                src={token.imageUrl} 
                alt={token.symbol || 'Token'} 
                className="w-9 h-9 rounded-full object-cover ring-2 ring-border/50"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-border/50">
                <span className="font-bold text-sm text-primary">{token.symbol?.slice(0, 2)}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{token.name}</span>
                <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                  {token.riskScore ?? 0}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{token.symbol}/SOL</span>
                <span className="text-xs">·</span>
                <a 
                  href={`https://dexscreener.com/solana/${token.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  DexScreener
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* DexScreener Chart Widget */}
          <div className="border-b border-border/50">
            <DexScreenerChart mint={token.mint} symbol={token.symbol || 'TOKEN'} />
          </div>

          {/* Price Section */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="text-2xl font-bold font-mono tracking-tight">${formatPrice(token.priceUsd)}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">5m</p>
                  <p className={cn("font-semibold tabular-nums", (token.priceChange5m ?? 0) >= 0 ? "text-primary" : "text-destructive")}>
                    {(token.priceChange5m ?? 0) >= 0 ? '+' : ''}{(token.priceChange5m ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">1h</p>
                  <p className={cn("font-semibold tabular-nums", (token.priceChange1h ?? 0) >= 0 ? "text-primary" : "text-destructive")}>
                    {(token.priceChange1h ?? 0) >= 0 ? '+' : ''}{(token.priceChange1h ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">24h</p>
                  <p className={cn("font-semibold tabular-nums", (token.priceChange24h ?? 0) >= 0 ? "text-primary" : "text-destructive")}>
                    {(token.priceChange24h ?? 0) >= 0 ? '+' : ''}{(token.priceChange24h ?? 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-xs">MCap</span>
              </div>
              <p className="font-semibold text-lg">${formatNumber(token.marketCap)}</p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-xs">Vol 24h</span>
              </div>
              <p className="font-semibold text-lg">${formatNumber(token.volume24h)}</p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Age</span>
              </div>
              <p className="font-semibold text-lg">{token.ageMinutes}m</p>
            </div>
          </div>

          {/* Contract Address */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <span className="text-xs text-muted-foreground font-medium">CA:</span>
            <code className="text-xs font-mono flex-1 truncate text-foreground/80">{token.mint}</code>
            <div className="flex gap-1">
              <Button 
                size="icon"
                variant="ghost" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => copyToClipboard(token.mint)}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button 
                size="icon"
                variant="ghost" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => window.open(`https://solscan.io/token/${token.mint}`, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Trading Interface */}
          <div className="p-4">
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50">
                <TabsTrigger 
                  value="buy" 
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground font-medium"
                >
                  Buy
                </TabsTrigger>
                <TabsTrigger 
                  value="sell" 
                  className="data-[state=active]:bg-background data-[state=active]:text-destructive font-medium"
                >
                  Sell
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-4 pt-4">
                <div>
                  <Label className="text-sm font-medium">Amount (SOL)</Label>
                  <Input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.1"
                    className="mt-2 h-12 text-lg font-mono bg-muted/30 border-border/50"
                  />
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {[0.05, 0.1, 0.25, 0.5, 1].map((amount) => (
                      <Button
                        key={amount}
                        size="sm"
                        variant={buyAmount === amount.toString() ? "default" : "outline"}
                        onClick={() => setBuyAmount(amount.toString())}
                        className={cn(
                          "h-9 font-mono text-sm",
                          buyAmount === amount.toString() && "bg-primary text-primary-foreground"
                        )}
                      >
                        {amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      Slippage
                    </Label>
                    <span className="text-sm font-mono text-muted-foreground">{slippage}%</span>
                  </div>
                  <Slider
                    value={[slippage]}
                    onValueChange={(v) => setSlippage(v[0])}
                    min={1}
                    max={50}
                    step={1}
                    className="py-2"
                  />
                </div>

                {/* Auto SL/TP Settings */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auto Exit</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1 text-destructive">
                          <ShieldOff className="w-3 h-3" />
                          Stop Loss
                        </Label>
                        <span className="text-xs font-mono text-destructive">-{stopLoss}%</span>
                      </div>
                      <Slider
                        value={[stopLoss]}
                        onValueChange={(v) => setStopLoss(v[0])}
                        min={5}
                        max={50}
                        step={1}
                        className="py-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1 text-primary">
                          <Target className="w-3 h-3" />
                          Take Profit
                        </Label>
                        <span className="text-xs font-mono text-primary">+{takeProfit}%</span>
                      </div>
                      <Slider
                        value={[takeProfit]}
                        onValueChange={(v) => setTakeProfit(v[0])}
                        min={10}
                        max={200}
                        step={5}
                        className="py-1"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 text-base font-semibold" 
                  onClick={handleBuy}
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    `Buy ${token.symbol}`
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="sell" className="space-y-4 pt-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Sell Amount</Label>
                    <span className="text-sm font-mono text-muted-foreground">{sellPercent}%</span>
                  </div>
                  <Slider
                    value={[sellPercent]}
                    onValueChange={(v) => setSellPercent(v[0])}
                    min={1}
                    max={100}
                    step={1}
                    className="py-2"
                  />
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[25, 50, 75, 100].map((pct) => (
                      <Button
                        key={pct}
                        size="sm"
                        variant={sellPercent === pct ? "default" : "outline"}
                        onClick={() => setSellPercent(pct)}
                        className={cn(
                          "h-9 font-mono text-sm",
                          sellPercent === pct && "bg-destructive text-destructive-foreground"
                        )}
                      >
                        {pct}%
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      Slippage
                    </Label>
                    <span className="text-sm font-mono text-muted-foreground">{slippage}%</span>
                  </div>
                  <Slider
                    value={[slippage]}
                    onValueChange={(v) => setSlippage(v[0])}
                    min={1}
                    max={50}
                    step={1}
                    className="py-2"
                  />
                </div>

                <Button 
                  className="w-full h-12 text-base font-semibold" 
                  variant="destructive"
                  onClick={handleSell}
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    `Sell ${sellPercent}% ${token.symbol}`
                  )}
                </Button>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-xs text-destructive">
                    Make sure you have a position in this token before selling.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
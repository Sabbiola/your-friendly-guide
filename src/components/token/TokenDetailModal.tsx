import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTokenAnalysis, TokenAnalysis } from '@/hooks/useTokenAnalysis';
import { useTokenHolders, TokenHoldersData, Holder } from '@/hooks/useTokenHolders';
import { useTokenChart, OHLCVData } from '@/hooks/useTokenChart';
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Copy, 
  Check,
  Users,
  Activity,
  Droplets,
  DollarSign,
  Clock,
  AlertTriangle,
  Shield,
  Flame,
  BarChart3
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ComposedChart, Bar } from 'recharts';

interface TokenDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenMint: string;
  tokenSymbol?: string;
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

function StatBox({ label, value, icon: Icon, variant = 'default' }: { 
  label: string; 
  value: string; 
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colors = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };
  
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
      <Icon className={`w-4 h-4 ${colors[variant]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-semibold ${colors[variant]}`}>{value}</p>
      </div>
    </div>
  );
}

function HolderRow({ holder, index }: { holder: Holder; index: number }) {
  const [copied, setCopied] = useState(false);
  
  const copyAddress = () => {
    navigator.clipboard.writeText(holder.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-6 text-xs text-muted-foreground text-center">{index + 1}</span>
        <div className="flex items-center gap-2">
          {holder.label && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {holder.label.includes('Dev') ? '🔥 Dev' : holder.label}
            </Badge>
          )}
          <button 
            onClick={copyAddress}
            className="flex items-center gap-1 text-sm font-mono hover:text-primary transition-colors"
          >
            {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 opacity-50" />}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono">{formatNumber(holder.balance, 0)}</span>
        <span className={`text-sm font-semibold min-w-[60px] text-right ${
          holder.percentage > 10 ? 'text-destructive' : 
          holder.percentage > 5 ? 'text-warning' : 'text-foreground'
        }`}>
          {holder.percentage.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export function TokenDetailModal({ isOpen, onClose, tokenMint, tokenSymbol }: TokenDetailModalProps) {
  const { tokenData, isLoading: tokenLoading, analyzeToken } = useTokenAnalysis();
  const { data: holdersData, isLoading: holdersLoading, fetchHolders } = useTokenHolders();
  const { chartData, isLoading: chartLoading, fetchChart } = useTokenChart();
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && tokenMint) {
      analyzeToken(tokenMint);
      fetchHolders(tokenMint);
      fetchChart(tokenMint, '15m');
    }
  }, [isOpen, tokenMint, analyzeToken, fetchHolders, fetchChart]);

  const isLoading = tokenLoading || holdersLoading;
  const priceChange = tokenData?.priceChange24h || 0;
  const isPositive = priceChange >= 0;

  // Transform chart data for display
  const displayChartData = chartData.map(d => ({
    time: new Date(d.time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    price: d.close,
    volume: d.volume,
  }));

  const copyMint = () => {
    navigator.clipboard.writeText(tokenMint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Risk assessment
  const getRiskLevel = () => {
    if (!tokenData && !holdersData) return null;
    
    let riskScore = 0;
    const warnings: string[] = [];
    
    if (tokenData?.liquidity && tokenData.liquidity < 10000) {
      riskScore += 2;
      warnings.push('Bassa liquidità');
    }
    
    if (holdersData?.devWallet && holdersData.devWallet.percentage > 10) {
      riskScore += 2;
      warnings.push(`Dev holdings: ${holdersData.devWallet.percentage.toFixed(1)}%`);
    }
    
    if (holdersData?.top10Percentage && holdersData.top10Percentage > 50) {
      riskScore += 1;
      warnings.push('Alta concentrazione holders');
    }
    
    if (tokenData?.createdAt) {
      const age = Date.now() - new Date(tokenData.createdAt).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        riskScore += 1;
        warnings.push('Token < 24h');
      }
    }
    
    return {
      level: riskScore >= 4 ? 'high' : riskScore >= 2 ? 'medium' : 'low',
      score: riskScore,
      warnings,
    };
  };
  
  const risk = getRiskLevel();

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
                <span className="text-lg font-bold text-primary">
                  {tokenSymbol?.charAt(0) || tokenData?.symbol?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {tokenData?.name || tokenSymbol || 'Loading...'}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{tokenData?.symbol || tokenSymbol}</span>
                  <button onClick={copyMint} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {tokenMint.slice(0, 8)}...
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {tokenLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatPrice(tokenData?.priceUsd || null)}</p>
                    <p className={`text-sm flex items-center justify-end gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                    </p>
                  </div>
                  
                  {risk && (
                    <div className={`px-3 py-1.5 rounded-lg ${
                      risk.level === 'high' ? 'bg-destructive/20 text-destructive' :
                      risk.level === 'medium' ? 'bg-warning/20 text-warning' :
                      'bg-success/20 text-success'
                    }`}>
                      <div className="flex items-center gap-1">
                        {risk.level === 'high' ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        <span className="text-xs font-semibold uppercase">{risk.level} Risk</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="holders">
                Holders {holdersData?.totalHolders ? `(${formatNumber(holdersData.totalHolders, 0)})` : ''}
              </TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="info">Token Info</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="mt-0 space-y-4">
                {/* Chart */}
                <div className="h-48 glass-card p-4">
                  {chartLoading || displayChartData.length === 0 ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={displayChartData}>
                        <defs>
                          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`$${value.toFixed(8)}`, 'Price']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                          fill="url(#priceGradient)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <StatBox label="Market Cap" value={`$${formatNumber(tokenData?.marketCap || null)}`} icon={DollarSign} />
                  <StatBox label="Volume 24h" value={`$${formatNumber(tokenData?.volume24h || null)}`} icon={BarChart3} />
                  <StatBox label="Liquidity" value={`$${formatNumber(tokenData?.liquidity || null)}`} icon={Droplets} 
                    variant={tokenData?.liquidity && tokenData.liquidity < 10000 ? 'warning' : 'default'} />
                  <StatBox label="TX 24h" value={formatNumber(tokenData?.txCount24h || null, 0)} icon={Activity} />
                </div>

                {/* Risk Warnings */}
                {risk && risk.warnings.length > 0 && (
                  <div className={`p-4 rounded-lg border ${
                    risk.level === 'high' ? 'bg-destructive/10 border-destructive/30' :
                    risk.level === 'medium' ? 'bg-warning/10 border-warning/30' :
                    'bg-success/10 border-success/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        risk.level === 'high' ? 'text-destructive' : 'text-warning'
                      }`} />
                      <span className="text-sm font-semibold">Risk Warnings</span>
                    </div>
                    <ul className="space-y-1">
                      {risk.warnings.map((w, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{holdersData?.totalHolders ? formatNumber(holdersData.totalHolders, 0) : 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Total Holders</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <Flame className="w-5 h-5 mx-auto mb-2 text-warning" />
                    <p className={`text-2xl font-bold ${holdersData?.top10Percentage && holdersData.top10Percentage > 50 ? 'text-warning' : ''}`}>
                      {holdersData?.top10Percentage?.toFixed(1) || 'N/A'}%
                    </p>
                    <p className="text-xs text-muted-foreground">Top 10 Holdings</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <AlertTriangle className={`w-5 h-5 mx-auto mb-2 ${holdersData?.devWallet?.percentage && holdersData.devWallet.percentage > 10 ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <p className={`text-2xl font-bold ${holdersData?.devWallet?.percentage && holdersData.devWallet.percentage > 10 ? 'text-destructive' : ''}`}>
                      {holdersData?.devWallet?.percentage?.toFixed(1) || '0'}%
                    </p>
                    <p className="text-xs text-muted-foreground">Dev Holdings</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="holders" className="mt-0">
                <div className="glass-card divide-y divide-border/30">
                  <div className="flex items-center justify-between py-2 px-3 text-xs text-muted-foreground font-medium">
                    <span className="w-6">#</span>
                    <span className="flex-1">Wallet</span>
                    <span className="w-24 text-right">Balance</span>
                    <span className="w-16 text-right">%</span>
                  </div>
                  
                  {holdersLoading ? (
                    <div className="p-4 space-y-2">
                      {[...Array(10)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : holdersData?.topHolders && holdersData.topHolders.length > 0 ? (
                    holdersData.topHolders.map((holder, i) => (
                      <HolderRow key={holder.address} holder={holder} index={i} />
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nessun dato holders disponibile</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="trades" className="mt-0">
                <div className="glass-card p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                      <p className="text-3xl font-bold text-success">{tokenData?.buys24h || 0}</p>
                      <p className="text-sm text-muted-foreground">Buy 24h</p>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                      <p className="text-3xl font-bold text-destructive">{tokenData?.sells24h || 0}</p>
                      <p className="text-sm text-muted-foreground">Sell 24h</p>
                    </div>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Trade history dettagliata in arrivo</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="info" className="mt-0">
                <div className="glass-card p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Contract Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono truncate flex-1">{tokenMint}</code>
                        <button onClick={copyMint}>
                          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">DEX</p>
                      <p className="text-sm font-medium capitalize">{tokenData?.dexId || 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Created</p>
                      <p className="text-sm font-medium">
                        {tokenData?.createdAt ? new Date(tokenData.createdAt).toLocaleDateString('it-IT') : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Pair Address</p>
                      <p className="text-xs font-mono truncate">{tokenData?.pairAddress || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <a href={`https://solscan.io/token/${tokenMint}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Solscan
                      </a>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <a href={`https://dexscreener.com/solana/${tokenMint}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        DexScreener
                      </a>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <a href={`https://birdeye.so/token/${tokenMint}?chain=solana`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Birdeye
                      </a>
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

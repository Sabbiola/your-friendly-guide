import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  CheckCircle2,
  Coins,
  TrendingUp,
  Loader2,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Ghost
} from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { toast } from 'sonner';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { PortfolioTokensChart } from '@/components/dashboard/PortfolioTokensChart';

export default function MyWallet() {
  const { 
    walletAddress, 
    setWalletAddress, 
    walletData, 
    walletLoading, 
    walletError,
    summary,
    trades,
    transactionsLoading,
    refreshTransactions,
    dailyPnL,
    isInitialized,
  } = useWalletContext();

  const {
    phantomInstalled,
    phantomAddress,
    isConnecting: phantomConnecting,
    connectPhantom,
    disconnectPhantom,
  } = usePhantomWallet();

  const [inputAddress, setInputAddress] = useState(walletAddress || '');
  const [copied, setCopied] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    setInputAddress(walletAddress || '');
  }, [walletAddress]);

  // Sync phantom address with wallet context
  useEffect(() => {
    if (phantomAddress && phantomAddress !== walletAddress) {
      setWalletAddress(phantomAddress);
    }
  }, [phantomAddress, walletAddress, setWalletAddress]);

  const handlePhantomConnect = async () => {
    const address = await connectPhantom();
    if (address) {
      setWalletAddress(address);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAddress.length >= 32 && inputAddress.length <= 44) {
      setWalletAddress(inputAddress);
      setShowManualInput(false);
      toast.success('Wallet connesso!');
    } else {
      toast.error('Indirizzo wallet non valido');
    }
  };

  const handleDisconnect = async () => {
    if (phantomAddress) {
      await disconnectPhantom();
    }
    setWalletAddress('');
    toast.success('Wallet disconnesso');
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Indirizzo copiato!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  const isLoading = walletLoading || transactionsLoading;

  // Transform dailyPnL for the chart
  const pnlChartData = dailyPnL.length > 0 
    ? dailyPnL.map(d => ({
        date: new Date(d.date).toLocaleDateString('it-IT', { weekday: 'short' }),
        pnl: d.pnl
      }))
    : [{ date: '-', pnl: 0 }];

  // Get recent trades (last 10)
  const recentTrades = trades.slice(0, 10);

  // If no wallet connected, show connection screen
  if (!walletAddress) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="glass-card w-full max-w-md">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 glow-primary">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">Connetti il tuo Wallet</CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Connetti Phantom per accedere alle tue statistiche e gestire le posizioni
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phantom Connect Button */}
              <Button 
                onClick={handlePhantomConnect}
                className="w-full h-14 gap-3 text-base bg-[#AB9FF2] hover:bg-[#9580FF] text-white"
                disabled={phantomConnecting}
              >
                {phantomConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connessione...
                  </>
                ) : (
                  <>
                    <Ghost className="w-5 h-5" />
                    {phantomInstalled ? 'Connetti Phantom' : 'Installa Phantom'}
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    oppure
                  </span>
                </div>
              </div>

              {/* Manual Input Toggle */}
              {!showManualInput ? (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowManualInput(true)}
                >
                  Inserisci indirizzo manualmente
                </Button>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <Input
                    placeholder="Indirizzo wallet Solana..."
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    className="font-mono text-sm h-12"
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowManualInput(false)}
                    >
                      Annulla
                    </Button>
                    <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Connetti
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Perché connettere?
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <span>Visualizza PnL e performance in tempo reale</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                  <span>Monitora i tuoi token holdings</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <History className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <span>Storico trade e analisi on-chain</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Wallet connected - show full dashboard
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1 tracking-tight">Il Mio Wallet</h1>
            <p className="text-muted-foreground text-sm">
              Gestisci il tuo wallet e monitora le performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshTransactions()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnetti
            </Button>
          </div>
        </div>

        {/* Wallet Info Card */}
        <Card className="glass-card overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#AB9FF2]/20 flex items-center justify-center">
                  <Ghost className="w-7 h-7 text-[#AB9FF2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-semibold">{shortAddress}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={copyAddress}
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <a
                      href={`https://solscan.io/account/${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm text-muted-foreground">
                      {phantomAddress ? 'Connesso via Phantom' : 'Connesso'}
                    </span>
                  </div>
                </div>
              </div>
              
              {walletData && (
                <div className="text-right">
                  <p className="text-3xl font-bold font-mono">
                    {walletData.balanceSol.toFixed(4)} <span className="text-lg text-muted-foreground">SOL</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {walletData.tokens.length} token attivi
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {walletError && (
          <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            {walletError}
          </div>
        )}

        {isLoading && !isInitialized && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <TrendingUp className="w-3 h-3" />
                PnL Totale
              </div>
              <p className={`text-2xl font-bold font-mono ${summary.totalPnlSol >= 0 ? 'text-success' : 'text-destructive'}`}>
                {summary.totalPnlSol >= 0 ? '+' : ''}{summary.totalPnlSol.toFixed(2)} SOL
              </p>
            </Card>
            <Card className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Zap className="w-3 h-3" />
                Trade Totali
              </div>
              <p className="text-2xl font-bold">{summary.totalTrades}</p>
            </Card>
            <Card className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <CheckCircle2 className="w-3 h-3" />
                Win Rate
              </div>
              <p className="text-2xl font-bold">{summary.winRate.toFixed(0)}%</p>
            </Card>
            <Card className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Coins className="w-3 h-3" />
                Trade Vincenti
              </div>
              <p className="text-2xl font-bold">{summary.winningTrades}</p>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PnLChart data={pnlChartData} />
          <PortfolioTokensChart />
        </div>

        {/* Token Holdings & Recent Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Holdings */}
          {walletData && walletData.tokens.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  Token Holdings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                  {walletData.tokens.map((token) => (
                    <div
                      key={token.mint}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{token.symbol}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <p className="font-mono font-medium">
                        {token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Trades */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Trade Recenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTrades.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                  {recentTrades.map((trade, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          trade.type === 'buy' ? 'bg-success/20' : 'bg-destructive/20'
                        }`}>
                          {trade.type === 'buy' ? (
                            <ArrowDownLeft className="w-4 h-4 text-success" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{trade.tokenSymbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(trade.blockTime * 1000).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-medium ${
                          trade.type === 'buy' ? 'text-success' : 'text-destructive'
                        }`}>
                          {trade.type === 'buy' ? '-' : '+'}{trade.solAmount?.toFixed(4)} SOL
                        </p>
                        <p className="text-xs text-muted-foreground">{trade.platform}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nessun trade trovato</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

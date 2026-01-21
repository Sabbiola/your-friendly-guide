import { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';
import { toast } from 'sonner';

export function WalletOverview() {
  const { 
    walletAddress, 
    setWalletAddress, 
    walletData, 
    walletLoading, 
    walletError,
    summary,
    transactionsLoading,
    refreshTransactions,
  } = useWalletContext();

  const [inputAddress, setInputAddress] = useState(walletAddress || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInputAddress(walletAddress || '');
  }, [walletAddress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAddress.length >= 32 && inputAddress.length <= 44) {
      setWalletAddress(inputAddress);
    } else {
      toast.error('Indirizzo wallet non valido');
    }
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

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Wallet Overview
          </CardTitle>
          {walletAddress && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshTransactions()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Inserisci indirizzo wallet Phantom..."
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            className="font-mono text-sm"
          />
          <Button type="submit" size="sm" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Carica'}
          </Button>
        </form>

        {walletError && (
          <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
            {walletError}
          </div>
        )}

        {isLoading && walletAddress && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <div className="text-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Analizzando transazioni on-chain...
            </div>
          </div>
        )}

        {walletData && !walletLoading && (
          <>
            {/* Wallet Address */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <span className="font-mono text-sm">{shortAddress}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={copyAddress}
              >
                {copied ? (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
              <a
                href={`https://solscan.io/account/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
            </div>

            {/* Balance & Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Coins className="w-3 h-3" />
                  Balance SOL
                </div>
                <p className="text-2xl font-bold font-mono">
                  {walletData.balanceSol.toFixed(4)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Token Attivi
                </div>
                <p className="text-2xl font-bold">
                  {walletData.tokens.length}
                </p>
              </div>
            </div>

            {/* Trading Summary from On-Chain Data */}
            {summary && (
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30">
                <div className="text-center">
                  <p className="text-lg font-bold">{summary.totalTrades}</p>
                  <p className="text-xs text-muted-foreground">Trade Totali</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${summary.totalPnlSol >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {summary.totalPnlSol >= 0 ? '+' : ''}{summary.totalPnlSol.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">PnL SOL</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{summary.winRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>
              </div>
            )}

            {/* Token Holdings */}
            {walletData.tokens.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Token Holdings</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {walletData.tokens.slice(0, 10).map((token) => (
                    <div
                      key={token.mint}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{token.symbol}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">
                          {token.uiAmount.toLocaleString(undefined, { 
                            maximumFractionDigits: 4 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {walletData.tokens.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{walletData.tokens.length - 10} altri token
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {!walletAddress && !isLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Inserisci l'indirizzo del tuo wallet Phantom</p>
            <p className="text-xs mt-1">per visualizzare balance, trade e performance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useTokenPrices } from "@/hooks/useTokenPrices";
import { TokenPriceCard } from "./TokenPriceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/contexts/WalletContext";
import { useMemo } from "react";

export function PortfolioTokensChart() {
  const { walletData, walletLoading, walletAddress } = useWalletContext();
  
  // Get token mints from real wallet data
  const portfolioTokens = useMemo(() => {
    if (!walletData?.tokens) return [];
    return walletData.tokens
      .filter(t => t.uiAmount > 0)
      .slice(0, 8)
      .map(t => ({
        mint: t.mint,
        symbol: t.symbol,
        balance: t.uiAmount,
        pnl: 0 // Will be calculated from trades
      }));
  }, [walletData?.tokens]);

  const tokenMints = portfolioTokens.map(t => t.mint);
  const { tokenPrices, isLoading: pricesLoading, error, refetch } = useTokenPrices(tokenMints);

  const isLoading = walletLoading || (pricesLoading && tokenPrices.size === 0);

  if (!walletAddress) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <CardTitle className="font-display">Token in Portafoglio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Coins className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              Inserisci un wallet per visualizzare i token
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <CardTitle className="font-display">Token in Portafoglio</CardTitle>
            {pricesLoading && tokenPrices.size > 0 && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refetch} 
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Aggiorna</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Caricamento prezzi token...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[140px] w-full rounded-xl loading-shimmer" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Riprova
            </Button>
          </div>
        ) : portfolioTokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">Nessun token nel wallet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioTokens.map((token) => {
              const priceData = tokenPrices.get(token.mint);
              return priceData ? (
                <TokenPriceCard
                  key={token.mint}
                  symbol={token.symbol}
                  mint={token.mint}
                  price={priceData.price}
                  priceHistory={priceData.priceHistory}
                  balance={token.balance}
                  pnl={token.pnl}
                />
              ) : (
                <div key={token.mint} className="h-[140px] w-full rounded-xl loading-shimmer" />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TradeRow } from "@/components/dashboard/TradeRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, ArrowUpRight, ArrowDownRight, Wallet, Loader2 } from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";

export default function Trades() {
  const { trades, summary, transactionsLoading, walletAddress } = useWalletContext();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const matchesSearch = trade.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || trade.type === typeFilter;
      const matchesPlatform = platformFilter === "all" || trade.platform === platformFilter;
      return matchesSearch && matchesType && matchesPlatform;
    });
  }, [trades, searchQuery, typeFilter, platformFilter]);

  const buyCount = trades.filter((t) => t.type === "buy").length;
  const sellCount = trades.filter((t) => t.type === "sell").length;
  const totalPnL = summary?.totalPnlSol || 0;

  const formatTime = (blockTime: number) => {
    const date = new Date(blockTime * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    return `${diffDays} giorni fa`;
  };

  const exportToCsv = () => {
    if (trades.length === 0) return;
    
    const headers = ['Data', 'Token', 'Tipo', 'SOL', 'Quantità Token', 'Piattaforma', 'TX'];
    const rows = trades.map(t => [
      new Date(t.blockTime * 1000).toISOString(),
      t.tokenSymbol,
      t.type,
      t.solAmount.toFixed(4),
      t.tokenAmount.toString(),
      t.platform,
      t.signature
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Trade History</h1>
            <p className="text-muted-foreground">
              Storico completo dei trade on-chain
            </p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={exportToCsv}
            disabled={trades.length === 0}
          >
            <Download className="w-4 h-4" />
            Esporta CSV
          </Button>
        </div>

        {/* No Wallet State */}
        {!walletAddress && (
          <div className="glass-card p-12 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nessun wallet connesso</h3>
            <p className="text-muted-foreground mb-4">
              Inserisci l'indirizzo del tuo wallet nella dashboard per vedere i trade
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Vai alla Dashboard
            </Button>
          </div>
        )}

        {/* Loading State */}
        {walletAddress && transactionsLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analizzando transazioni on-chain...</span>
            </div>
          </div>
        )}

        {/* Stats */}
        {walletAddress && !transactionsLoading && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <p className="text-muted-foreground text-sm mb-1">Trade Totali</p>
                <p className="font-display text-2xl font-bold">{trades.length}</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="w-4 h-4 text-success" />
                  <p className="text-muted-foreground text-sm">Buy</p>
                </div>
                <p className="font-display text-2xl font-bold text-success">{buyCount}</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                  <p className="text-muted-foreground text-sm">Sell</p>
                </div>
                <p className="font-display text-2xl font-bold text-destructive">{sellCount}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-muted-foreground text-sm mb-1">PnL Totale</p>
                <p className={`font-display text-2xl font-bold ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
                  {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)} SOL
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca token..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Piattaforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="jupiter">Jupiter</SelectItem>
                  <SelectItem value="raydium">Raydium</SelectItem>
                  <SelectItem value="pumpfun">Pump.fun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trade List */}
            <div className="glass-card overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-4 border-b border-border text-sm text-muted-foreground font-medium">
                <div className="col-span-2">Token</div>
                <div>Amount</div>
                <div>SOL</div>
                <div>Tempo</div>
                <div></div>
              </div>
              {trades.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nessun trade swap trovato nel wallet
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredTrades.map((trade) => (
                    <TradeRow
                      key={trade.signature}
                      token={trade.tokenMint}
                      tokenSymbol={trade.tokenSymbol}
                      type={trade.type}
                      amount={trade.solAmount}
                      price={trade.priceUsd || 0}
                      time={formatTime(trade.blockTime)}
                      platform={trade.platform === 'jupiter' ? 'jupiter' : trade.platform === 'pumpfun' ? 'pumpfun' : 'jupiter'}
                      txHash={trade.signature}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

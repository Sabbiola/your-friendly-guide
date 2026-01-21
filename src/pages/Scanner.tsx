import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Scan, 
  RefreshCw, 
  Play, 
  Pause, 
  Clock, 
  Zap,
  TrendingUp,
  BarChart3,
  Wallet,
  Users,
  Shield,
  ArrowUpDown
} from "lucide-react";
import { usePumpfunScanner, type SortOption } from "@/hooks/usePumpfunScanner";
import { TokenCard } from "@/components/scanner/TokenCard";
import { ScannerFilters } from "@/components/scanner/ScannerFilters";
import { ScannerPositions } from "@/components/scanner/ScannerPositions";
import { cn } from "@/lib/utils";

export default function Scanner() {
  const {
    tokens,
    settings,
    isScanning,
    isAutoScan,
    lastScan,
    error,
    sortBy,
    setSortBy,
    scan,
    toggleAutoScan,
    saveSettings,
  } = usePumpfunScanner();

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Calculate stats from tokens
  const tokensWithHolders = tokens.filter(t => t.holdersCount !== null);
  const avgHolders = tokensWithHolders.length > 0
    ? tokensWithHolders.reduce((acc, t) => acc + (t.holdersCount || 0), 0) / tokensWithHolders.length
    : 0;

  const lowRiskTokens = tokens.filter(t => (t.riskScore || 100) <= 40);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Pump.fun Scanner
            </h1>
            <p className="text-muted-foreground mt-1">
              Token scanner con dati on-chain da Helius RPC
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <Badge 
              variant={isAutoScan ? "default" : "secondary"}
              className={cn(
                "px-3 py-1",
                isAutoScan && "bg-primary/20 text-primary border border-primary/30"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full mr-2",
                isAutoScan ? "bg-primary animate-pulse" : "bg-muted-foreground"
              )} />
              {isAutoScan ? 'Auto-Scan Attivo' : 'Auto-Scan Off'}
            </Badge>

            {/* Last Scan */}
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(lastScan)}
            </Badge>

            {/* Manual Scan */}
            <Button
              onClick={scan}
              disabled={isScanning}
              variant="outline"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isScanning && "animate-spin")} />
              {isScanning ? 'Scanning...' : 'Scan Now'}
            </Button>

            {/* Auto Scan Toggle */}
            <Button
              onClick={toggleAutoScan}
              variant={isAutoScan ? "destructive" : "default"}
            >
              {isAutoScan ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Auto
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Auto
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <ScannerFilters settings={settings} onSave={saveSettings} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Scan className="w-4 h-4" />
              <span className="text-sm">Token Trovati</span>
            </div>
            <p className="text-2xl font-bold">{tokens.length}</p>
          </Card>

          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm">Low Risk</span>
            </div>
            <p className="text-2xl font-bold text-primary">{lowRiskTokens.length}</p>
          </Card>

          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Avg Holders</span>
            </div>
            <p className="text-2xl font-bold">{avgHolders.toFixed(0)}</p>
          </Card>

          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Avg Volume</span>
            </div>
            <p className="text-2xl font-bold">
              {tokens.length > 0 
                ? `$${(tokens.reduce((acc, t) => acc + (t.volume24h || 0), 0) / tokens.length / 1000).toFixed(0)}K`
                : '-'
              }
            </p>
          </Card>

          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Refresh Rate</span>
            </div>
            <p className="text-2xl font-bold">{settings.refreshIntervalSeconds}s</p>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <p className="text-destructive">{error}</p>
          </Card>
        )}

        {/* Tabs: Tokens + Positions */}
        <Tabs defaultValue="tokens" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="tokens" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Token Trovati ({tokens.length})
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Le Mie Posizioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="mt-6">
            {/* Sort Selector */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {tokens.length} token{tokens.length !== 1 ? 's' : ''} trovati
              </p>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Ordina per..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bondingCurve">Bonding Curve %</SelectItem>
                    <SelectItem value="volume">Volume 24h</SelectItem>
                    <SelectItem value="marketCap">Market Cap</SelectItem>
                    <SelectItem value="age">Più Recenti</SelectItem>
                    <SelectItem value="riskScore">Risk Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tokens.length === 0 ? (
              <Card className="glass-card p-12 text-center">
                <Scan className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun token trovato</h3>
                <p className="text-muted-foreground mb-4">
                  Clicca "Scan Now" o attiva l'auto-scan per iniziare a cercare token
                </p>
                <Button onClick={scan} disabled={isScanning}>
                  <Scan className="w-4 h-4 mr-2" />
                  Avvia Scansione
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tokens.map((token) => (
                  <TokenCard key={token.mint} token={token} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="positions" className="mt-6">
            <ScannerPositions />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
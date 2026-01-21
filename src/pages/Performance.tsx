import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PnLChart } from "@/components/dashboard/PnLChart";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Target, Zap, Trophy, Clock, Wallet, Loader2 } from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

const PLATFORM_COLORS: Record<string, string> = {
  'Jupiter': 'hsl(190 80% 50%)',
  'Raydium': 'hsl(280 80% 60%)',
  'Pump.fun': 'hsl(45 90% 55%)',
  'Altro': 'hsl(215 15% 55%)',
};

export default function Performance() {
  const { 
    summary, 
    trades, 
    topTokens, 
    platformDistribution, 
    dailyPnL,
    transactionsLoading, 
    walletAddress 
  } = useWalletContext();

  // Calculate weekly data
  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const weeklyPnL: Map<string, number> = new Map();
    
    // Initialize all days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      weeklyPnL.set(dayName, 0);
    }
    
    // Calculate PnL per day
    for (const trade of trades) {
      const date = new Date(trade.blockTime * 1000);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      if (date >= weekAgo) {
        const dayName = days[date.getDay()];
        const existing = weeklyPnL.get(dayName) || 0;
        const pnlChange = trade.type === 'sell' ? trade.solAmount : -trade.solAmount;
        weeklyPnL.set(dayName, existing + pnlChange);
      }
    }
    
    return Array.from(weeklyPnL.entries()).map(([date, pnl]) => ({ date, pnl }));
  }, [trades]);

  // Calculate best and worst trades
  const tradeStats = useMemo(() => {
    const sellTrades = trades.filter(t => t.type === 'sell');
    if (sellTrades.length === 0) {
      return { bestTrade: 0, worstTrade: 0, avgHoldTime: 'N/A' };
    }
    
    const bestTrade = Math.max(...sellTrades.map(t => t.solAmount));
    const worstTrade = Math.min(...sellTrades.map(t => t.solAmount));
    
    return { bestTrade, worstTrade, avgHoldTime: 'N/A' };
  }, [trades]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    return dailyPnL.slice(-30).map(d => ({
      date: new Date(d.date).getDate().toString(),
      pnl: d.pnl,
    }));
  }, [dailyPnL]);

  // Platform data for pie chart
  const platformData = useMemo(() => {
    return platformDistribution.map(p => ({
      ...p,
      color: PLATFORM_COLORS[p.name] || PLATFORM_COLORS['Altro'],
    }));
  }, [platformDistribution]);

  if (!walletAddress) {
    return (
      <DashboardLayout>
        <div className="glass-card p-12 text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Nessun wallet connesso</h3>
          <p className="text-muted-foreground mb-4">
            Inserisci l'indirizzo del tuo wallet nella dashboard per vedere le performance
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Vai alla Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (transactionsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Performance</h1>
            <p className="text-muted-foreground">
              Analisi dettagliata delle tue performance di trading
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analizzando transazioni on-chain...</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalPnL = summary?.totalPnlSol || 0;
  const winRate = summary?.winRate || 0;
  const totalTrades = summary?.totalTrades || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Performance</h1>
          <p className="text-muted-foreground">
            Analisi dettagliata delle tue performance di trading on-chain
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">PnL Totale</span>
            </div>
            <p className={`font-display text-xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} SOL
            </p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <p className="font-display text-xl font-bold">{winRate.toFixed(0)}%</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Trade Totali</span>
            </div>
            <p className="font-display text-xl font-bold">{totalTrades}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Hold Medio</span>
            </div>
            <p className="font-display text-xl font-bold">{tradeStats.avgHoldTime}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Best Trade</span>
            </div>
            <p className="font-display text-xl font-bold text-success">
              +{tradeStats.bestTrade.toFixed(2)} SOL
            </p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Worst Trade</span>
            </div>
            <p className="font-display text-xl font-bold text-destructive">
              {tradeStats.worstTrade.toFixed(2)} SOL
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PnLChart data={monthlyData.length > 0 ? monthlyData : [{ date: 'N/A', pnl: 0 }]} />
          </div>

          {/* Platform Distribution */}
          <div className="glass-card p-4">
            <h3 className="font-display font-semibold mb-4">Distribuzione Piattaforme</h3>
            {platformData.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(220 18% 10%)",
                          border: "1px solid hsl(220 15% 18%)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 flex-wrap">
                  {platformData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="text-sm font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </div>
        </div>

        {/* Weekly Performance & Top Tokens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Bar Chart */}
          <div className="glass-card p-4">
            <h3 className="font-display font-semibold mb-4">Performance Settimanale</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(215 15% 55%)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(215 15% 55%)", fontSize: 12 }}
                    tickFormatter={(value) => `${value.toFixed(1)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220 18% 10%)",
                      border: "1px solid hsl(220 15% 18%)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} SOL`, 'PnL']}
                  />
                  <Bar
                    dataKey="pnl"
                    radius={[4, 4, 0, 0]}
                    fill="hsl(145 80% 50%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Tokens */}
          <div className="glass-card p-4">
            <h3 className="font-display font-semibold mb-4">Top Token per Volume</h3>
            {topTokens.length > 0 ? (
              <div className="space-y-3">
                {topTokens.slice(0, 5).map((token, index) => (
                  <div
                    key={token.mint}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{token.symbol}</p>
                        <p className="text-xs text-muted-foreground">{token.trades} trades</p>
                      </div>
                    </div>
                    <p className={`font-display font-bold ${token.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {token.pnl >= 0 ? "+" : ""}{token.pnl.toFixed(2)} SOL
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nessun dato token disponibile
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

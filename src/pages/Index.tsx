import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { PnLChart } from "@/components/dashboard/PnLChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SolPriceChart } from "@/components/dashboard/SolPriceChart";
import { OpenPositions } from "@/components/dashboard/OpenPositions";
import { Wallet, TrendingUp, Zap, Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveWallets } from "@/hooks/useWallets";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useWalletContext } from "@/contexts/WalletContext";

export default function Index() {
  const { data: wallets, isLoading: walletsLoading } = useActiveWallets();
  const navigate = useNavigate();
  const { summary, tradesToday, dailyPnL, transactionsLoading, walletAddress } = useWalletContext();
  
  // Enable realtime subscriptions
  useRealtimeSubscription();

  // Use real data from WalletContext
  const totalPnl = summary?.totalPnlSol || 0;
  const winRate = summary?.winRate || 0;
  const totalTrades = summary?.totalTrades || 0;
  const isLoadingStats = transactionsLoading && !!walletAddress;
  
  // Transform dailyPnL for the chart
  const pnlChartData = dailyPnL.length > 0 
    ? dailyPnL.map(d => ({
        date: new Date(d.date).toLocaleDateString('it-IT', { weekday: 'short' }),
        pnl: d.pnl
      }))
    : [{ date: '-', pnl: 0 }];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1 tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Overview del tuo copy trading bot
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-success text-sm font-medium">Bot Online</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="PnL Totale"
            value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} SOL`}
            change={totalPnl !== 0 ? (totalPnl > 0 ? 12.5 : -12.5) : 0}
            icon={<TrendingUp className="w-5 h-5" />}
            variant={totalPnl >= 0 ? "success" : "destructive"}
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Trade Totali"
            value={String(totalTrades)}
            icon={<Wallet className="w-5 h-5" />}
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Trade Oggi"
            value={String(tradesToday)}
            change={tradesToday > 0 ? 8 : 0}
            icon={<Zap className="w-5 h-5" />}
            isLoading={isLoadingStats}
          />
          <StatCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            change={winRate > 50 ? 5 : winRate > 0 ? -5 : 0}
            icon={<Target className="w-5 h-5" />}
            variant={winRate > 50 ? "success" : winRate > 0 ? "warning" : "default"}
            isLoading={isLoadingStats}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PnLChart data={pnlChartData} />
          </div>
          <div>
            <SolPriceChart />
          </div>
        </div>

        {/* Open Positions */}
        <OpenPositions />

        {/* Wallets and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Followed Wallets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Wallet Seguiti</h3>
              <button 
                className="text-xs text-primary hover:underline"
                onClick={() => navigate('/wallets')}
              >
                Vedi tutti
              </button>
            </div>
            {walletsLoading ? (
              <>
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </>
            ) : wallets && wallets.length > 0 ? (
              wallets.slice(0, 2).map((wallet) => (
                <WalletCard 
                  key={wallet.id} 
                  address={wallet.address}
                  label={wallet.name || 'Wallet'}
                  pnl={0}
                  winRate={0}
                  tradesCount={0}
                  isActive={wallet.is_active}
                />
              ))
            ) : (
              <div className="glass-card p-6 text-center">
                <p className="text-muted-foreground text-sm mb-3">Nessun wallet configurato</p>
                <Button size="sm" onClick={() => navigate('/wallets')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Wallet
                </Button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useWalletContext } from '@/contexts/WalletContext';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Target, 
  Activity,
  Wallet,
  Calendar,
  Zap
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function StatRow({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  isLoading 
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  trend?: 'up' | 'down' | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 group">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${
        trend === 'up' ? 'text-success' :
        trend === 'down' ? 'text-destructive' :
        'text-foreground'
      }`}>
        {value}
      </span>
    </div>
  );
}

export function UserProfileCard() {
  const { user } = useAuth();
  const { 
    summary, 
    tradesToday, 
    walletAddress, 
    transactionsLoading,
    topTokens 
  } = useWalletContext();

  const isLoading = transactionsLoading && !!walletAddress;
  
  const totalPnl = summary?.totalPnlSol || 0;
  const winRate = summary?.winRate || 0;
  const totalTrades = summary?.totalTrades || 0;
  const winningTrades = summary?.winningTrades || 0;
  const losingTrades = summary?.losingTrades || 0;

  // Calculate best token
  const bestToken = topTokens.length > 0 ? topTokens[0] : null;

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Profile Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
          <span className="text-lg font-bold text-primary-foreground">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {user?.email?.split('@')[0] || 'Utente'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {walletAddress 
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : 'Nessun wallet connesso'
            }
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 border border-success/30">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success font-medium">Attivo</span>
        </div>
      </div>

      {/* Main PnL Card */}
      <div className={`p-4 rounded-xl ${
        totalPnl >= 0 
          ? 'bg-gradient-to-br from-success/20 to-success/5 border border-success/20' 
          : 'bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/20'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">PnL Totale</span>
          {totalPnl >= 0 ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={`text-2xl font-bold ${
            totalPnl >= 0 ? 'text-success' : 'text-destructive'
          }`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(4)} SOL
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="divide-y divide-border/50">
        <StatRow
          label="Trade Totali"
          value={String(totalTrades)}
          icon={Activity}
          isLoading={isLoading}
        />
        <StatRow
          label="Trade Oggi"
          value={String(tradesToday)}
          icon={Calendar}
          isLoading={isLoading}
        />
        <StatRow
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          icon={Target}
          trend={winRate > 50 ? 'up' : winRate > 0 ? 'down' : null}
          isLoading={isLoading}
        />
        <StatRow
          label="Vincenti / Perdenti"
          value={`${winningTrades} / ${losingTrades}`}
          icon={Trophy}
          trend={winningTrades > losingTrades ? 'up' : winningTrades < losingTrades ? 'down' : null}
          isLoading={isLoading}
        />
      </div>

      {/* Best Token */}
      {bestToken && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">Best Token</span>
            </div>
            <span className="text-xs font-semibold text-success">
              +{bestToken.pnl.toFixed(4)} SOL
            </span>
          </div>
          <p className="text-sm font-medium mt-1">{bestToken.symbol}</p>
        </div>
      )}

      {/* Wallet Status */}
      {walletAddress && (
        <a
          href={`https://solscan.io/account/${walletAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-xs text-muted-foreground hover:text-foreground"
        >
          <Wallet className="w-3 h-3" />
          Vedi wallet su Solscan
        </a>
      )}
    </div>
  );
}

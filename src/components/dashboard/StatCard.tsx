import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
  isLoading?: boolean;
}

export function StatCard({ title, value, change, icon, variant = "default", isLoading }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  if (isLoading) {
    return (
      <div className="stat-card">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-12 h-5 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-7 w-28" />
      </div>
    );
  }

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
          variant === "success" && "bg-success/10 text-success",
          variant === "warning" && "bg-warning/10 text-warning",
          variant === "destructive" && "bg-destructive/10 text-destructive",
          variant === "default" && "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-all",
            isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-1">{title}</p>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

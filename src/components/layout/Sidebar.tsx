import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  History,
  Settings,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bot,
  Scan,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Wallet, label: "Il Mio Wallet", path: "/my-wallet" },
  { icon: Scan, label: "Pump Scanner", path: "/scanner" },
  { icon: Bot, label: "AI Assistant", path: "/assistant" },
  { icon: History, label: "Server Logs", path: "/logs" },
  { icon: Wallet, label: "Wallet Seguiti", path: "/wallets" },
  { icon: History, label: "Trade History", path: "/trades" },
  { icon: TrendingUp, label: "Performance", path: "/performance" },
  { icon: Settings, label: "Configurazione", path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="font-display font-bold text-lg gradient-text">
                SolCopy
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bot Status */}
        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="glass-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">Bot Attivo</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ultimo trade: 2 min fa
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full mt-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>
        )}

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </div>
    </aside>
  );
}

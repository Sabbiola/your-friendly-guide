import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWalletScanner } from "@/hooks/useWalletScanner";
import { CopyTradingSettings } from "@/components/copytrading/CopyTradingSettings";
import { CopyTradingStats } from "@/components/copytrading/CopyTradingStats";

interface Wallet {
  id: string;
  address: string;
  name: string | null;
  balance_sol: number | null;
  is_active: boolean;
  created_at: string;
}

export default function Wallets() {
  const { user } = useAuth();
  const { scanWallet, isScanning } = useWalletScanner();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newWalletLabel, setNewWalletLabel] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchWallets = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWallets(data || []);
    } catch (err) {
      console.error('Error fetching wallets:', err);
      toast.error('Errore nel caricamento wallet');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWallets();
    }
  }, [user]);

  const filteredWallets = wallets.filter(
    (wallet) =>
      (wallet.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      wallet.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddWallet = async () => {
    if (!newWalletAddress || !newWalletLabel) {
      toast.error("Inserisci indirizzo e nome del wallet");
      return;
    }

    if (!user) {
      toast.error("Devi essere autenticato");
      return;
    }

    // Validate Solana address format
    if (newWalletAddress.length < 32 || newWalletAddress.length > 44) {
      toast.error("Indirizzo Solana non valido");
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          address: newWalletAddress,
          name: newWalletLabel,
          is_active: true,
        });

      if (error) throw error;

      toast.success(`Wallet "${newWalletLabel}" aggiunto!`);
      setNewWalletAddress("");
      setNewWalletLabel("");
      setDialogOpen(false);
      fetchWallets();

      // Scan the new wallet for existing trades
      await scanWallet(newWalletAddress);
    } catch (err) {
      console.error('Error adding wallet:', err);
      toast.error('Errore nell\'aggiunta del wallet');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (walletId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('wallets')
        .update({ is_active: !currentState })
        .eq('id', walletId);

      if (error) throw error;
      
      setWallets(prev => prev.map(w => 
        w.id === walletId ? { ...w, is_active: !currentState } : w
      ));
      
      toast.success(currentState ? 'Wallet disattivato' : 'Wallet attivato');
    } catch (err) {
      console.error('Error toggling wallet:', err);
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const handleScanAll = async () => {
    for (const wallet of wallets.filter(w => w.is_active)) {
      await scanWallet(wallet.address);
    }
    toast.success('Scan completato!');
  };

  const totalPnl = 0; // Would be calculated from trades
  const activeCount = wallets.filter(w => w.is_active).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Wallet Seguiti</h1>
            <p className="text-muted-foreground">
              Gestisci i wallet da cui copiare i trade
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleScanAll}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Scan Tutti
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Aggiungi Wallet
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display">Aggiungi Wallet</DialogTitle>
                  <DialogDescription>
                    Inserisci l'indirizzo Solana del wallet da seguire
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Indirizzo Wallet</Label>
                    <Input
                      placeholder="Es: 9WzDXwBbmkg8ZTb..."
                      value={newWalletAddress}
                      onChange={(e) => setNewWalletAddress(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome / Label</Label>
                    <Input
                      placeholder="Es: Alpha Trader"
                      value={newWalletLabel}
                      onChange={(e) => setNewWalletLabel(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button onClick={handleAddWallet} disabled={isAdding}>
                    {isAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Aggiungendo...
                      </>
                    ) : (
                      'Aggiungi'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtri
          </Button>
        </div>

        {/* Copy Trading Settings */}
        <CopyTradingSettings />

        {/* Copy Trading Stats */}
        <CopyTradingStats />

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">Wallet Totali</p>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="font-display text-2xl font-bold">{wallets.length}</p>
            )}
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">Wallet Attivi</p>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="font-display text-2xl font-bold text-success">{activeCount}</p>
            )}
          </div>
          <div className="glass-card p-4">
            <p className="text-muted-foreground text-sm mb-1">PnL Combinato</p>
            <p className="font-display text-2xl font-bold text-muted-foreground">
              Calcolo...
            </p>
          </div>
        </div>

        {/* Wallet Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground mb-4">Nessun wallet aggiunto</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi il primo wallet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWallets.map((wallet) => (
              <WalletCard 
                key={wallet.id} 
                address={wallet.address}
                label={wallet.name || 'Wallet'}
                pnl={0}
                winRate={0}
                tradesCount={0}
                isActive={wallet.is_active}
                onToggle={() => handleToggleActive(wallet.id, wallet.is_active)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

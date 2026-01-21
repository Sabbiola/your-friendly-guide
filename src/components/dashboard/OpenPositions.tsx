import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Coins, TrendingUp, TrendingDown, ExternalLink, Eye, DollarSign, Loader2 } from 'lucide-react';
import { useOpenPositions, Position } from '@/hooks/usePositions';
import { PositionMiniChart } from './PositionMiniChart';
import { TokenDetailModal } from '@/components/token/TokenDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface SellModalProps {
  position: Position;
  isOpen: boolean;
  onClose: () => void;
}

function SellModal({ position, isOpen, onClose }: SellModalProps) {
  const [sellPercent, setSellPercent] = useState(100);
  const [slippage, setSlippage] = useState(12);
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();

  const handleSell = async () => {
    setIsExecuting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('scanner-trade', {
        body: {
          tokenMint: position.token_mint,
          tokenSymbol: position.token_symbol,
          tokenName: position.token_symbol,
          action: 'sell',
          sellPercent,
          slippage,
          priceUsd: position.current_price || 0,
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          <div>
            <p className="font-semibold">Vendita eseguita{data.demoMode ? ' (Demo)' : ''}!</p>
            <p className="text-sm text-muted-foreground">
              {sellPercent}% di {position.token_symbol}
            </p>
          </div>
        );
        queryClient.invalidateQueries({ queryKey: ['positions'] });
        queryClient.invalidateQueries({ queryKey: ['trades'] });
        onClose();
      } else {
        throw new Error(data?.error || 'Vendita fallita');
      }
    } catch (error) {
      console.error('Sell error:', error);
      toast.error(`Errore vendita: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const estimatedValue = (position.current_price || 0) * position.amount * (sellPercent / 100);
  const pnlPercent = position.unrealized_pnl_percent || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-destructive" />
            Vendi {position.token_symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Position Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantità posseduta</span>
              <span className="font-mono">{position.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prezzo acquisto</span>
              <span className="font-mono">{position.avg_buy_price?.toFixed(8) || '-'} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prezzo attuale</span>
              <span className="font-mono">{position.current_price?.toFixed(8) || '-'} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PnL</span>
              <span className={cn("font-semibold", pnlPercent >= 0 ? "text-primary" : "text-destructive")}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Sell Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Percentuale da vendere</Label>
              <span className="text-lg font-bold">{sellPercent}%</span>
            </div>
            <Slider
              value={[sellPercent]}
              onValueChange={(v) => setSellPercent(v[0])}
              min={1}
              max={100}
              step={1}
            />
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <Button
                  key={pct}
                  size="sm"
                  variant={sellPercent === pct ? "default" : "outline"}
                  onClick={() => setSellPercent(pct)}
                  className={cn(
                    "h-8",
                    sellPercent === pct && "bg-destructive text-destructive-foreground"
                  )}
                >
                  {pct}%
                </Button>
              ))}
            </div>
          </div>

          {/* Slippage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Slippage</Label>
              <span className="text-sm font-mono text-muted-foreground">{slippage}%</span>
            </div>
            <Slider
              value={[slippage]}
              onValueChange={(v) => setSlippage(v[0])}
              min={1}
              max={50}
              step={1}
            />
          </div>

          {/* Estimated Value */}
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valore stimato</span>
              <span className="font-mono font-semibold">{estimatedValue.toFixed(6)} SOL</span>
            </div>
          </div>

          {/* Sell Button */}
          <Button
            className="w-full h-12"
            variant="destructive"
            onClick={handleSell}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vendendo...
              </>
            ) : (
              `Vendi ${sellPercent}% di ${position.token_symbol}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OpenPositions() {
  const { data: positions, isLoading } = useOpenPositions();
  const [selectedToken, setSelectedToken] = useState<{ mint: string; symbol: string } | null>(null);
  const [sellPosition, setSellPosition] = useState<Position | null>(null);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Posizioni Aperte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const openPositions = positions?.filter((p) => p.is_open) || [];

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Posizioni Aperte
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {openPositions.length} attive
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {openPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nessuna posizione aperta</p>
              <p className="text-xs mt-1">Le posizioni appariranno qui quando il bot effettuerà acquisti</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Token</TableHead>
                    <TableHead className="text-xs text-right">Quantità</TableHead>
                    <TableHead className="text-xs text-right">Prezzo Acquisto</TableHead>
                    <TableHead className="text-xs text-right">Prezzo Attuale</TableHead>
                    <TableHead className="text-xs text-center">Andamento</TableHead>
                    <TableHead className="text-xs text-right">PnL</TableHead>
                    <TableHead className="text-xs text-center">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openPositions.map((position) => (
                    <PositionRow 
                      key={position.id} 
                      position={position} 
                      onViewDetails={() => setSelectedToken({ 
                        mint: position.token_mint, 
                        symbol: position.token_symbol 
                      })}
                      onSell={() => setSellPosition(position)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedToken && (
        <TokenDetailModal
          isOpen={!!selectedToken}
          onClose={() => setSelectedToken(null)}
          tokenMint={selectedToken.mint}
          tokenSymbol={selectedToken.symbol}
        />
      )}

      {sellPosition && (
        <SellModal
          position={sellPosition}
          isOpen={!!sellPosition}
          onClose={() => setSellPosition(null)}
        />
      )}
    </>
  );
}

function PositionRow({ 
  position, 
  onViewDetails, 
  onSell 
}: { 
  position: Position; 
  onViewDetails: () => void;
  onSell: () => void;
}) {
  const pnlPercent = position.unrealized_pnl_percent || 0;
  const pnlSol = position.unrealized_pnl_sol || 0;
  const isProfit = pnlPercent >= 0;

  return (
    <TableRow className="border-border/30 hover:bg-muted/30">
      <TableCell>
        <button 
          onClick={onViewDetails}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {position.token_symbol?.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm hover:text-primary transition-colors">{position.token_symbol}</p>
              <a
                href={`https://solscan.io/token/${position.token_mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {position.token_mint?.slice(0, 6)}...{position.token_mint?.slice(-4)}
            </p>
          </div>
        </button>
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {position.amount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-muted-foreground">
        {position.avg_buy_price
          ? `${position.avg_buy_price.toFixed(8)} SOL`
          : '-'}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {position.current_price
          ? `${position.current_price.toFixed(8)} SOL`
          : '-'}
      </TableCell>
      <TableCell className="text-center">
        <div className="w-24 h-10 mx-auto">
          <PositionMiniChart 
            tokenMint={position.token_mint} 
            isProfit={isProfit} 
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-0.5">
          <div className={`flex items-center gap-1 ${isProfit ? 'text-success' : 'text-destructive'}`}>
            {isProfit ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="font-medium text-sm">
              {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
            </span>
          </div>
          <span className={`text-xs font-mono ${isProfit ? 'text-success/80' : 'text-destructive/80'}`}>
            {isProfit ? '+' : ''}{pnlSol.toFixed(4)} SOL
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onViewDetails}
            className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Vedi dettagli token"
          >
            <Eye className="w-4 h-4" />
          </button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 px-3 text-xs"
            onClick={onSell}
          >
            Vendi
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useCopyTrading } from '@/hooks/useCopyTrading';
import { Zap, Settings, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function CopyTradingSettings() {
  const { settings, recentCopyTrades, isLoading, isSaving, updateSettings, toggleEnabled } = useCopyTrading();
  const [localMaxPosition, setLocalMaxPosition] = useState<string>('');
  const [localSlippage, setLocalSlippage] = useState<number[]>([]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  const handleMaxPositionBlur = () => {
    const value = parseFloat(localMaxPosition);
    if (!isNaN(value) && value > 0) {
      updateSettings({ max_position_sol: value });
    }
    setLocalMaxPosition('');
  };

  const handleSlippageChange = (value: number[]) => {
    setLocalSlippage(value);
  };

  const handleSlippageCommit = () => {
    if (localSlippage.length > 0) {
      updateSettings({ slippage_percent: localSlippage[0] });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main toggle card */}
      <Card className={`border-2 transition-colors ${settings.is_enabled ? 'border-green-500/50 bg-green-500/5' : 'border-border/50 bg-card/50'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.is_enabled ? 'bg-green-500/20' : 'bg-muted'}`}>
                <Zap className={`h-5 w-5 ${settings.is_enabled ? 'text-green-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Copy Trading Automatico</CardTitle>
                <CardDescription>
                  {settings.is_enabled ? 'Attivo - I trade vengono eseguiti automaticamente' : 'Disattivato'}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={toggleEnabled}
              disabled={isSaving}
            />
          </div>
        </CardHeader>
        {settings.is_enabled && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg p-2">
              <AlertTriangle className="h-3 w-3" />
              <span>I trade saranno eseguiti automaticamente sul tuo wallet</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Settings card */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Impostazioni</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max position */}
          <div className="space-y-2">
            <Label className="text-sm">Max posizione per trade (SOL)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder={settings.max_position_sol.toString()}
              value={localMaxPosition}
              onChange={(e) => setLocalMaxPosition(e.target.value)}
              onBlur={handleMaxPositionBlur}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              Attuale: {settings.max_position_sol} SOL
            </p>
          </div>

          {/* Slippage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Slippage tolerance</Label>
              <Badge variant="outline">{localSlippage[0] ?? settings.slippage_percent}%</Badge>
            </div>
            <Slider
              value={localSlippage.length > 0 ? localSlippage : [settings.slippage_percent]}
              onValueChange={handleSlippageChange}
              onValueCommit={handleSlippageCommit}
              min={0.1}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* DEX selection */}
          <div className="space-y-3">
            <Label className="text-sm">DEX abilitati</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={settings.use_jupiter ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ use_jupiter: !settings.use_jupiter })}
                disabled={isSaving}
              >
                {settings.use_jupiter ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Jupiter
              </Button>
              <Button
                variant={settings.use_pumpfun ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ use_pumpfun: !settings.use_pumpfun })}
                disabled={isSaving}
              >
                {settings.use_pumpfun ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Pump.fun
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent copy trades */}
      {recentCopyTrades.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trade Copiati Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCopyTrades.slice(0, 5).map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={trade.trade_type === 'buy' ? 'default' : 'secondary'}
                      className={trade.trade_type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                    >
                      {trade.trade_type.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-sm">{trade.token_symbol}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {trade.executed_amount_sol?.toFixed(3)} SOL
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        trade.status === 'completed'
                          ? 'border-green-500/50 text-green-400'
                          : trade.status === 'failed'
                          ? 'border-red-500/50 text-red-400'
                          : 'border-yellow-500/50 text-yellow-400'
                      }
                    >
                      {trade.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

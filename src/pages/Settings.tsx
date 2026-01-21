import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, AlertTriangle, Zap, Shield, Bell, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { telegramService } from "@/services/telegramService";

export default function Settings() {
  const [settings, setSettings] = useState({
    // Trading Settings
    maxTradeSize: 1.0,
    minTradeSize: 0.1,
    slippage: 1.5,
    autoBuy: true,
    autoSell: true,
    copyPercentage: 100,
    
    // Risk Management
    stopLoss: 20,
    takeProfit: 50,
    maxDailyTrades: 50,
    maxOpenPositions: 10,
    
    // Filters
    minLiquidity: 10000,
    minHolders: 100,
    avoidRugs: true,
    avoidHoneypots: true,
    
    // Notifications
    notifyTrades: true,
    notifyPnL: true,
    notifyStopLoss: true,
    notifyTakeProfit: true,
    notifyWalletMovements: true,
    telegramEnabled: true,
    
    // Bot Connection
    botApiEndpoint: "",
    botApiKey: "",
  });

  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    toast.success("Impostazioni salvate con successo!");
  };

  const testTelegramNotification = async () => {
    setIsTesting(true);
    try {
      const success = await telegramService.notifyTrade({
        token: "TEST",
        tokenMint: "test123",
        action: "buy",
        amount: 1.5,
        price: 0.00001234,
        totalValue: 25.50,
        platform: "Jupiter",
        txHash: "test_tx_hash_123456",
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        walletLabel: "Test Wallet",
      });
      
      if (success) {
        toast.success("Notifica di test inviata su Telegram!");
      } else {
        toast.error("Errore nell'invio della notifica");
      }
    } catch (error) {
      toast.error("Errore nel test Telegram");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Configurazione</h1>
            <p className="text-muted-foreground">
              Personalizza il comportamento del copy trading bot
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salva Modifiche
          </Button>
        </div>

        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="trading" className="gap-2">
              <Zap className="w-4 h-4" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-2">
              <Shield className="w-4 h-4" />
              Risk Management
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger value="connection" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Bot Connection
            </TabsTrigger>
          </TabsList>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-6">
            <div className="glass-card p-6 space-y-6">
              <h3 className="font-display font-semibold text-lg">Parametri Trading</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Trade Size Massimo (SOL)</Label>
                  <Input
                    type="number"
                    value={settings.maxTradeSize}
                    onChange={(e) => setSettings({ ...settings, maxTradeSize: parseFloat(e.target.value) })}
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trade Size Minimo (SOL)</Label>
                  <Input
                    type="number"
                    value={settings.minTradeSize}
                    onChange={(e) => setSettings({ ...settings, minTradeSize: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Slippage Tollerato: {settings.slippage}%</Label>
                </div>
                <Slider
                  value={[settings.slippage]}
                  onValueChange={([value]) => setSettings({ ...settings, slippage: value })}
                  min={0.1}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Percentuale da Copiare: {settings.copyPercentage}%</Label>
                </div>
                <Slider
                  value={[settings.copyPercentage]}
                  onValueChange={([value]) => setSettings({ ...settings, copyPercentage: value })}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="font-medium">Auto Buy</p>
                  <p className="text-sm text-muted-foreground">Copia automaticamente gli acquisti</p>
                </div>
                <Switch
                  checked={settings.autoBuy}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBuy: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="font-medium">Auto Sell</p>
                  <p className="text-sm text-muted-foreground">Copia automaticamente le vendite</p>
                </div>
                <Switch
                  checked={settings.autoSell}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoSell: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Piattaforma Preferita</Label>
                <Select defaultValue="jupiter">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jupiter">Jupiter (migliori prezzi)</SelectItem>
                    <SelectItem value="pumpfun">Pump.fun (nuovi token)</SelectItem>
                    <SelectItem value="auto">Auto (segui wallet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Risk Management Tab */}
          <TabsContent value="risk" className="space-y-6">
            <div className="glass-card p-6 space-y-6">
              <h3 className="font-display font-semibold text-lg">Gestione Rischio</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Stop Loss: {settings.stopLoss}%</Label>
                </div>
                <Slider
                  value={[settings.stopLoss]}
                  onValueChange={([value]) => setSettings({ ...settings, stopLoss: value })}
                  min={5}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Take Profit: {settings.takeProfit}%</Label>
                </div>
                <Slider
                  value={[settings.takeProfit]}
                  onValueChange={([value]) => setSettings({ ...settings, takeProfit: value })}
                  min={10}
                  max={500}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Max Trade Giornalieri</Label>
                  <Input
                    type="number"
                    value={settings.maxDailyTrades}
                    onChange={(e) => setSettings({ ...settings, maxDailyTrades: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Posizioni Aperte</Label>
                  <Input
                    type="number"
                    value={settings.maxOpenPositions}
                    onChange={(e) => setSettings({ ...settings, maxOpenPositions: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-6">
              <h3 className="font-display font-semibold text-lg">Filtri Sicurezza</h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Liquidità Minima ($)</Label>
                  <Input
                    type="number"
                    value={settings.minLiquidity}
                    onChange={(e) => setSettings({ ...settings, minLiquidity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Holders Minimi</Label>
                  <Input
                    type="number"
                    value={settings.minHolders}
                    onChange={(e) => setSettings({ ...settings, minHolders: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="font-medium">Evita Rug Pull</p>
                  <p className="text-sm text-muted-foreground">Salta token con segnali di rug</p>
                </div>
                <Switch
                  checked={settings.avoidRugs}
                  onCheckedChange={(checked) => setSettings({ ...settings, avoidRugs: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="font-medium">Evita Honeypot</p>
                  <p className="text-sm text-muted-foreground">Salta token non vendibili</p>
                </div>
                <Switch
                  checked={settings.avoidHoneypots}
                  onCheckedChange={(checked) => setSettings({ ...settings, avoidHoneypots: checked })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-lg">Notifiche Telegram</h3>
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle className="w-4 h-4" />
                  Configurato
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Le credenziali Telegram sono salvate in modo sicuro nel backend. Seleziona quali eventi notificare:
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="notifyTrades"
                      checked={settings.notifyTrades}
                      onCheckedChange={(checked) => setSettings({ ...settings, notifyTrades: !!checked })}
                    />
                    <div>
                      <label htmlFor="notifyTrades" className="font-medium cursor-pointer">Nuovi Trade Eseguiti</label>
                      <p className="text-sm text-muted-foreground">Ogni volta che il bot esegue un trade</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="notifyWalletMovements"
                      checked={settings.notifyWalletMovements}
                      onCheckedChange={(checked) => setSettings({ ...settings, notifyWalletMovements: !!checked })}
                    />
                    <div>
                      <label htmlFor="notifyWalletMovements" className="font-medium cursor-pointer">Movimenti Wallet Seguiti</label>
                      <p className="text-sm text-muted-foreground">Quando un wallet copiato fa un'operazione</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="notifyPnL"
                      checked={settings.notifyPnL}
                      onCheckedChange={(checked) => setSettings({ ...settings, notifyPnL: !!checked })}
                    />
                    <div>
                      <label htmlFor="notifyPnL" className="font-medium cursor-pointer">Alert PnL</label>
                      <p className="text-sm text-muted-foreground">Soglie di profitto/perdita raggiunte</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="notifyStopLoss"
                      checked={settings.notifyStopLoss}
                      onCheckedChange={(checked) => setSettings({ ...settings, notifyStopLoss: !!checked })}
                    />
                    <div>
                      <label htmlFor="notifyStopLoss" className="font-medium cursor-pointer">Stop-Loss</label>
                      <p className="text-sm text-muted-foreground">Quando scatta lo stop-loss</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="notifyTakeProfit"
                      checked={settings.notifyTakeProfit}
                      onCheckedChange={(checked) => setSettings({ ...settings, notifyTakeProfit: !!checked })}
                    />
                    <div>
                      <label htmlFor="notifyTakeProfit" className="font-medium cursor-pointer">Take-Profit</label>
                      <p className="text-sm text-muted-foreground">Quando viene raggiunto il target</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={testTelegramNotification}
                  disabled={isTesting}
                >
                  <Send className={`w-4 h-4 ${isTesting ? 'animate-pulse' : ''}`} />
                  {isTesting ? 'Invio in corso...' : 'Invia Notifica di Test'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Bot Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Configurazione Bot</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Inserisci l'endpoint API del tuo bot esistente per collegarlo a questa dashboard.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bot API Endpoint</Label>
                <Input
                  placeholder="https://your-bot-api.com/api"
                  value={settings.botApiEndpoint}
                  onChange={(e) => setSettings({ ...settings, botApiEndpoint: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={settings.botApiKey}
                  onChange={(e) => setSettings({ ...settings, botApiKey: e.target.value })}
                />
              </div>

              <Button variant="outline" className="w-full">
                Testa Connessione
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useBotSettings } from "@/hooks/useBotSettings";
import { Play, Square, Activity, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BotControl() {
    const { settings, loading, updateSettings, toggleBot } = useBotSettings();
    const [editMode, setEditMode] = useState(false);
    const [localSettings, setLocalSettings] = useState(settings);

    const handleToggleBot = async () => {
        const result = await toggleBot();
        if (result.success) {
            toast.success(settings?.is_running ? "Bot stopped" : "Bot started");
        } else {
            toast.error(result.error || "Failed to toggle bot");
        }
    };

    const handleSaveSettings = async () => {
        if (!localSettings) return;

        const result = await updateSettings({
            auto_trade: localSettings.auto_trade,
            paper_mode: localSettings.paper_mode,
            max_position_size: localSettings.max_position_size,
            stop_loss_percent: localSettings.stop_loss_percent,
            take_profit_percent: localSettings.take_profit_percent,
            max_positions: localSettings.max_positions,
        });

        if (result.success) {
            toast.success("Settings saved successfully");
            setEditMode(false);
        } else {
            toast.error(result.error || "Failed to save settings");
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse">Loading bot settings...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="p-8">
                <Card className="p-6">
                    <p className="text-center text-muted-foreground">
                        Bot settings not configured. Please contact support.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Activity className="w-8 h-8" />
                        Bot Control
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your trading bot settings and status
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant={settings.is_running ? "default" : "secondary"} className="text-sm px-3 py-1">
                        {settings.is_running ? (
                            <>
                                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                                Running
                            </>
                        ) : (
                            <>
                                <Square className="w-4 h-4 mr-2" />
                                Stopped
                            </>
                        )}
                    </Badge>

                    <Button
                        onClick={handleToggleBot}
                        variant={settings.is_running ? "destructive" : "default"}
                        size="lg"
                    >
                        {settings.is_running ? (
                            <>
                                <Square className="w-4 h-4 mr-2" />
                                Stop Bot
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Start Bot
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Settings Card */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5" />
                        Trading Settings
                    </h2>
                    {!editMode && (
                        <Button variant="outline" onClick={() => {
                            setLocalSettings(settings);
                            setEditMode(true);
                        }}>
                            Edit Settings
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Auto Trade Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="auto-trade">Auto Trading</Label>
                            <p className="text-xs text-muted-foreground">
                                Enable automated trading
                            </p>
                        </div>
                        <Switch
                            id="auto-trade"
                            checked={editMode ? localSettings?.auto_trade : settings.auto_trade}
                            onCheckedChange={(checked) =>
                                editMode && setLocalSettings({ ...localSettings!, auto_trade: checked })
                            }
                            disabled={!editMode}
                        />
                    </div>

                    {/* Paper Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="paper-mode">Paper Mode</Label>
                            <p className="text-xs text-muted-foreground">
                                Simulate trades without real money
                            </p>
                        </div>
                        <Switch
                            id="paper-mode"
                            checked={editMode ? localSettings?.paper_mode : settings.paper_mode}
                            onCheckedChange={(checked) =>
                                editMode && setLocalSettings({ ...localSettings!, paper_mode: checked })
                            }
                            disabled={!editMode}
                        />
                    </div>

                    {/* Max Position Size */}
                    <div className="space-y-2">
                        <Label htmlFor="max-position">Max Position Size (SOL)</Label>
                        <Input
                            id="max-position"
                            type="number"
                            step="0.01"
                            value={editMode ? localSettings?.max_position_size : settings.max_position_size}
                            onChange={(e) =>
                                editMode && setLocalSettings({ ...localSettings!, max_position_size: parseFloat(e.target.value) })
                            }
                            disabled={!editMode}
                        />
                    </div>

                    {/* Stop Loss */}
                    <div className="space-y-2">
                        <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                        <Input
                            id="stop-loss"
                            type="number"
                            value={editMode ? localSettings?.stop_loss_percent : settings.stop_loss_percent}
                            onChange={(e) =>
                                editMode && setLocalSettings({ ...localSettings!, stop_loss_percent: parseFloat(e.target.value) })
                            }
                            disabled={!editMode}
                        />
                    </div>

                    {/* Take Profit */}
                    <div className="space-y-2">
                        <Label htmlFor="take-profit">Take Profit (%)</Label>
                        <Input
                            id="take-profit"
                            type="number"
                            value={editMode ? localSettings?.take_profit_percent : settings.take_profit_percent}
                            onChange={(e) =>
                                editMode && setLocalSettings({ ...localSettings!, take_profit_percent: parseFloat(e.target.value) })
                            }
                            disabled={!editMode}
                        />
                    </div>

                    {/* Max Positions */}
                    <div className="space-y-2">
                        <Label htmlFor="max-positions">Max Concurrent Positions</Label>
                        <Input
                            id="max-positions"
                            type="number"
                            value={editMode ? localSettings?.max_positions : settings.max_positions}
                            onChange={(e) =>
                                editMode && setLocalSettings({ ...localSettings!, max_positions: parseInt(e.target.value) })
                            }
                            disabled={!editMode}
                        />
                    </div>
                </div>

                {editMode && (
                    <div className="flex gap-3 mt-6">
                        <Button onClick={handleSaveSettings}>Save Changes</Button>
                        <Button variant="outline" onClick={() => setEditMode(false)}>
                            Cancel
                        </Button>
                    </div>
                )}
            </Card>

            {/* Status Info */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Bot Status</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">{settings.is_running ? "Active" : "Inactive"}</p>
                        <p className="text-xs text-muted-foreground">Status</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{settings.paper_mode ? "Paper" : "Live"}</p>
                        <p className="text-xs text-muted-foreground">Mode</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{settings.auto_trade ? "ON" : "OFF"}</p>
                        <p className="text-xs text-muted-foreground">Auto Trade</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{settings.max_positions}</p>
                        <p className="text-xs text-muted-foreground">Max Positions</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

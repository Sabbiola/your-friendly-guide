import { useState } from 'react';
import { Settings2, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ScannerSettings } from '@/hooks/usePumpfunScanner';
import { toast } from 'sonner';

interface ScannerFiltersProps {
  settings: ScannerSettings;
  onSave: (settings: Partial<ScannerSettings>) => void;
}

export function ScannerFilters({ settings, onSave }: ScannerFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    toast.success('Filter settings saved');
  };

  const updateSetting = <K extends keyof ScannerSettings>(key: K, value: ScannerSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="glass-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span>Scanner Filters</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* Market Cap */}
            <div className="space-y-2">
              <Label className="text-xs">Min Market Cap ($)</Label>
              <Input
                type="number"
                value={localSettings.minMarketCap}
                onChange={(e) => updateSetting('minMarketCap', Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Max Market Cap ($)</Label>
              <Input
                type="number"
                value={localSettings.maxMarketCap}
                onChange={(e) => updateSetting('maxMarketCap', Number(e.target.value))}
                className="h-9"
              />
            </div>

            {/* Volume */}
            <div className="space-y-2">
              <Label className="text-xs">Min Volume 24h ($)</Label>
              <Input
                type="number"
                value={localSettings.minVolumeUsd}
                onChange={(e) => updateSetting('minVolumeUsd', Number(e.target.value))}
                className="h-9"
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label className="text-xs">Max Age (minutes): {localSettings.maxAgeMinutes}</Label>
              <Slider
                value={[localSettings.maxAgeMinutes]}
                onValueChange={(v) => updateSetting('maxAgeMinutes', v[0])}
                min={5}
                max={120}
                step={5}
              />
            </div>

            {/* Security Filters */}
            <div className="space-y-2">
              <Label className="text-xs">Max Dev Holding (%): {localSettings.maxDevHoldingPercent}</Label>
              <Slider
                value={[localSettings.maxDevHoldingPercent]}
                onValueChange={(v) => updateSetting('maxDevHoldingPercent', v[0])}
                min={1}
                max={20}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Max Insiders (%): {localSettings.maxInsidersPercent}</Label>
              <Slider
                value={[localSettings.maxInsidersPercent]}
                onValueChange={(v) => updateSetting('maxInsidersPercent', v[0])}
                min={5}
                max={50}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Min Bonding Curve (%): {localSettings.minBondingCurvePercent}</Label>
              <Slider
                value={[localSettings.minBondingCurvePercent]}
                onValueChange={(v) => updateSetting('minBondingCurvePercent', v[0])}
                min={10}
                max={95}
                step={5}
              />
            </div>

            {/* Refresh */}
            <div className="space-y-2">
              <Label className="text-xs">Refresh Interval (sec): {localSettings.refreshIntervalSeconds}</Label>
              <Slider
                value={[localSettings.refreshIntervalSeconds]}
                onValueChange={(v) => updateSetting('refreshIntervalSeconds', v[0])}
                min={5}
                max={60}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Min Bot Users: {localSettings.minBotUsers}</Label>
              <Slider
                value={[localSettings.minBotUsers]}
                onValueChange={(v) => updateSetting('minBotUsers', v[0])}
                min={0}
                max={50}
                step={5}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full mt-4">
            <Save className="w-4 h-4 mr-2" />
            Save Filters
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

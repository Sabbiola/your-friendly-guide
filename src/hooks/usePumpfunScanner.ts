import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ScannedToken {
  id: string;
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  priceChange5m: number | null;
  priceChange1h: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  bondingCurvePercent: number | null;
  devHoldingPercent: number | null;
  insidersPercent: number | null;
  holdersCount: number | null;
  top10HoldersPercent: number | null;
  buys24h: number | null;
  sells24h: number | null;
  txns24h: number | null;
  botUsers: number | null;
  createdAtToken: string | null;
  ageMinutes: number | null;
  pairAddress: string | null;
  dexId: string | null;
  riskScore: number | null;
  scannedAt: string;
  isStale?: boolean; // Added: indicates if token wasn't in latest scan
}

// Internal interface for tracking token persistence
interface TokenWithMeta extends ScannedToken {
  lastSeen: Date;
  scanCount: number;
}

export type SortOption = 'bondingCurve' | 'volume' | 'marketCap' | 'age' | 'riskScore';

export interface ScannerSettings {
  minMarketCap: number;
  maxMarketCap: number;
  maxAgeMinutes: number;
  minVolumeUsd: number;
  maxDevHoldingPercent: number;
  maxInsidersPercent: number;
  minBondingCurvePercent: number;
  minBotUsers: number;
  minFeesPercent: number;
  refreshIntervalSeconds: number;
}

const defaultSettings: ScannerSettings = {
  minMarketCap: 15000,
  maxMarketCap: 100000,
  maxAgeMinutes: 30,
  minVolumeUsd: 15000,
  maxDevHoldingPercent: 5,
  maxInsidersPercent: 20,
  minBondingCurvePercent: 35,
  minBotUsers: 10,
  minFeesPercent: 0.5,
  refreshIntervalSeconds: 10,
};

export function usePumpfunScanner() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ScannedToken[]>([]);
  const [settings, setSettings] = useState<ScannerSettings>(defaultSettings);
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false); // Ref to track scanning state without triggering re-renders/dependency changes
  const [isAutoScan, setIsAutoScan] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('bondingCurve');

  // Sort tokens based on selected option
  const sortedTokens = [...tokens].sort((a, b) => {
    switch (sortBy) {
      case 'bondingCurve':
        return (b.bondingCurvePercent ?? 0) - (a.bondingCurvePercent ?? 0);
      case 'volume':
        return (b.volume24h ?? 0) - (a.volume24h ?? 0);
      case 'marketCap':
        return (b.marketCap ?? 0) - (a.marketCap ?? 0);
      case 'age':
        return (a.ageMinutes ?? 999) - (b.ageMinutes ?? 999);
      case 'riskScore':
        return (a.riskScore ?? 100) - (b.riskScore ?? 100);
      default:
        return 0;
    }
  });

  // Load settings from database
  const loadSettings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('scanner_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle to avoid 406 error if row doesn't exist

    if (error) {
      console.error("Error loading settings:", error);
      return;
    }

    if (data) {
      setSettings({
        minMarketCap: data.min_market_cap || defaultSettings.minMarketCap,
        maxMarketCap: data.max_market_cap || defaultSettings.maxMarketCap,
        maxAgeMinutes: data.max_age_minutes || defaultSettings.maxAgeMinutes,
        minVolumeUsd: data.min_volume_usd || defaultSettings.minVolumeUsd,
        maxDevHoldingPercent: data.max_dev_holding_percent || defaultSettings.maxDevHoldingPercent,
        maxInsidersPercent: data.max_insiders_percent || defaultSettings.maxInsidersPercent,
        minBondingCurvePercent: data.min_bonding_curve_percent || defaultSettings.minBondingCurvePercent,
        minBotUsers: data.min_bot_users || defaultSettings.minBotUsers,
        minFeesPercent: data.min_fees_percent || defaultSettings.minFeesPercent,
        refreshIntervalSeconds: data.refresh_interval_seconds || defaultSettings.refreshIntervalSeconds,
      });
    } else {
      // Initialize default settings in DB if missing
      const { error: insertError } = await supabase
        .from('scanner_settings')
        .insert({
          user_id: user.id,
          min_market_cap: defaultSettings.minMarketCap,
          max_market_cap: defaultSettings.maxMarketCap,
          max_age_minutes: defaultSettings.maxAgeMinutes,
          min_volume_usd: defaultSettings.minVolumeUsd,
          max_dev_holding_percent: defaultSettings.maxDevHoldingPercent,
          max_insiders_percent: defaultSettings.maxInsidersPercent,
          min_bonding_curve_percent: defaultSettings.minBondingCurvePercent,
          min_bot_users: defaultSettings.minBotUsers,
          min_fees_percent: defaultSettings.minFeesPercent,
          refresh_interval_seconds: defaultSettings.refreshIntervalSeconds,
        });

      if (insertError) {
        console.error("Error initializing settings:", insertError);
      }
    }
  }, [user]);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: Partial<ScannerSettings>) => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    const { error } = await supabase
      .from('scanner_settings')
      .upsert({
        user_id: user.id,
        min_market_cap: updatedSettings.minMarketCap,
        max_market_cap: updatedSettings.maxMarketCap,
        max_age_minutes: updatedSettings.maxAgeMinutes,
        min_volume_usd: updatedSettings.minVolumeUsd,
        max_dev_holding_percent: updatedSettings.maxDevHoldingPercent,
        max_insiders_percent: updatedSettings.maxInsidersPercent,
        min_bonding_curve_percent: updatedSettings.minBondingCurvePercent,
        min_bot_users: updatedSettings.minBotUsers,
        min_fees_percent: updatedSettings.minFeesPercent,
        refresh_interval_seconds: updatedSettings.refreshIntervalSeconds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) console.error('Error saving scanner settings:', error);
  }, [user, settings]);

  // Load cached tokens
  const loadCachedTokens = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('scanned_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('market_cap', { ascending: false });

    if (data) {
      setTokens(data.map(t => ({
        id: t.id,
        mint: t.mint,
        name: t.name,
        symbol: t.symbol,
        imageUrl: null, // Not stored in DB yet
        priceUsd: t.price_usd,
        priceChange5m: t.price_change_5m,
        priceChange1h: t.price_change_1h,
        priceChange24h: t.price_change_24h,
        marketCap: t.market_cap,
        liquidityUsd: t.liquidity_usd,
        volume24h: t.volume_24h,
        bondingCurvePercent: t.bonding_curve_percent,
        devHoldingPercent: t.dev_holding_percent,
        insidersPercent: t.insiders_percent,
        holdersCount: t.holders_count,
        top10HoldersPercent: t.top_10_holders_percent,
        buys24h: t.buys_24h,
        sells24h: t.sells_24h,
        txns24h: t.txns_24h,
        botUsers: t.bot_users,
        createdAtToken: t.created_at_token,
        ageMinutes: t.age_minutes,
        pairAddress: t.pair_address,
        dexId: t.dex_id,
        riskScore: t.risk_score,
        scannedAt: t.scanned_at,
      })));
    }
  }, [user]);

  // Scan for tokens with retry logic
  const scan = useCallback(async (retryCount = 0) => {
    if (!user || isScanningRef.current) return;

    const MAX_RETRIES = 3;
    isScanningRef.current = true;
    setIsScanning(true);

    // Don't clear error immediately - keep showing previous error until new scan succeeds
    if (retryCount === 0) {
      setError(null);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error: fnError } = await supabase.functions.invoke('pumpfun-scanner', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (fnError) throw new Error(fnError.message);

      // STABILITY FIX: Merge strategy instead of complete replacement
      setTokens(prevTokens => {
        const now = new Date();
        const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

        // Create a map from existing tokens with metadata
        const tokenMap = new Map<string, TokenWithMeta>();
        prevTokens.forEach(t => {
          tokenMap.set(t.mint, {
            ...t,
            lastSeen: new Date(t.scannedAt),
            scanCount: 0,
          });
        });

        // Process new tokens from scan
        if (data?.tokens && Array.isArray(data.tokens)) {
          data.tokens.forEach((newToken: any) => {
            const existing = tokenMap.get(newToken.mint);
            tokenMap.set(newToken.mint, {
              id: newToken.mint,
              mint: newToken.mint,
              name: newToken.name,
              symbol: newToken.symbol,
              imageUrl: newToken.imageUrl,
              priceUsd: newToken.priceUsd,
              priceChange5m: newToken.priceChange5m,
              priceChange1h: newToken.priceChange1h,
              priceChange24h: newToken.priceChange24h,
              marketCap: newToken.marketCap,
              liquidityUsd: newToken.liquidityUsd,
              volume24h: newToken.volume24h,
              bondingCurvePercent: newToken.bondingCurvePercent,
              devHoldingPercent: newToken.devHoldingPercent,
              insidersPercent: newToken.insidersPercent,
              holdersCount: newToken.holdersCount,
              top10HoldersPercent: newToken.top10HoldersPercent,
              buys24h: newToken.buys24h,
              sells24h: newToken.sells24h,
              txns24h: newToken.txns24h,
              botUsers: newToken.botUsers,
              createdAtToken: newToken.createdAtToken,
              ageMinutes: newToken.ageMinutes,
              pairAddress: newToken.pairAddress,
              dexId: newToken.dexId,
              riskScore: newToken.riskScore,
              scannedAt: now.toISOString(),
              isStale: false, // Fresh token from latest scan
              lastSeen: now,
              scanCount: existing ? existing.scanCount + 1 : 1,
            });
          });

          // Mark tokens NOT in the new scan as stale
          if (data.tokens.length > 0) {
            const newMints = new Set(data.tokens.map((t: any) => t.mint));
            tokenMap.forEach((token, mint) => {
              if (!newMints.has(mint)) {
                token.isStale = true;
              }
            });
          }
        }

        // Remove tokens that haven't been seen in GRACE_PERIOD
        const filtered: ScannedToken[] = [];
        tokenMap.forEach((token) => {
          const timeSinceLastSeen = now.getTime() - token.lastSeen.getTime();
          if (timeSinceLastSeen < GRACE_PERIOD_MS) {
            // Remove metadata fields before adding to display list
            const { lastSeen, scanCount, ...displayToken } = token;
            filtered.push(displayToken);
          }
        });

        // If we got results, clear any previous errors
        if (data?.tokens && data.tokens.length > 0) {
          setError(null);
        }

        return filtered;
      });

      setLastScan(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      console.error('Scanner error:', message, 'Retry:', retryCount);

      // Retry logic with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s
        console.log(`Retrying scan in ${delay}ms...`);
        setTimeout(() => {
          scan(retryCount + 1);
        }, delay);
        setError(`${message} (retrying ${retryCount + 1}/${MAX_RETRIES}...)`);
      } else {
        setError(`${message} - Keeping previous tokens visible`);
      }
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, [user]);

  // Toggle auto-scan
  const toggleAutoScan = useCallback(() => {
    setIsAutoScan(prev => !prev);
  }, []);

  // Auto-scan effect
  useEffect(() => {
    if (!isAutoScan || !user) return;

    // Initial scan
    scan();

    // Set up interval
    const interval = setInterval(scan, settings.refreshIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [isAutoScan, user, settings.refreshIntervalSeconds, scan]);

  // Load settings and cached tokens on mount
  useEffect(() => {
    if (user) {
      loadSettings();
      loadCachedTokens();
    }
  }, [user, loadSettings, loadCachedTokens]);

  return {
    tokens: sortedTokens,
    settings,
    isScanning,
    isAutoScan,
    lastScan,
    error,
    sortBy,
    setSortBy,
    scan,
    toggleAutoScan,
    saveSettings,
  };
}

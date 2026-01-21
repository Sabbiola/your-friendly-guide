import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CopyTradeSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  max_position_sol: number;
  slippage_percent: number;
  use_jupiter: boolean;
  use_pumpfun: boolean;
}

export interface CopyTrade {
  id: string;
  user_id: string;
  source_wallet_id: string | null;
  source_signature: string;
  token_mint: string;
  token_symbol: string;
  trade_type: string;
  source_amount_sol: number;
  executed_amount_sol: number | null;
  status: string;
  tx_signature: string | null;
  error_message: string | null;
  platform: string | null;
  created_at: string;
  executed_at: string | null;
}

export function useCopyTrading() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CopyTradeSettings | null>(null);
  const [recentCopyTrades, setRecentCopyTrades] = useState<CopyTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('copy_trade_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as CopyTradeSettings);
      } else {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('copy_trade_settings')
          .insert({
            user_id: user.id,
            is_enabled: false,
            max_position_sol: 0.1,
            slippage_percent: 1,
            use_jupiter: true,
            use_pumpfun: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as CopyTradeSettings);
      }
    } catch (err) {
      console.error('Error fetching copy trade settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch recent copy trades
  const fetchRecentCopyTrades = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('copy_trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentCopyTrades((data || []) as CopyTrade[]);
    } catch (err) {
      console.error('Error fetching copy trades:', err);
    }
  }, [user]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<CopyTradeSettings>) => {
    if (!user || !settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('copy_trade_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast({
        title: 'Impostazioni salvate',
        description: 'Le impostazioni di copy trading sono state aggiornate.',
      });
    } catch (err) {
      console.error('Error updating settings:', err);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare le impostazioni.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, settings, toast]);

  // Toggle copy trading
  const toggleEnabled = useCallback(async () => {
    if (!settings) return;
    await updateSettings({ is_enabled: !settings.is_enabled });
  }, [settings, updateSettings]);

  // Execute copy trade
  const executeCopyTrade = useCallback(async (
    sourceWalletId: string,
    sourceSignature: string,
    tokenMint: string,
    tokenSymbol: string,
    tradeType: 'buy' | 'sell',
    sourceAmountSol: number,
    platform?: string
  ) => {
    if (!user || !settings?.is_enabled) return null;

    try {
      const { data, error } = await supabase.functions.invoke('copy-trade-executor', {
        body: {
          userId: user.id,
          sourceWalletId,
          sourceSignature,
          tokenMint,
          tokenSymbol,
          tradeType,
          sourceAmountSol,
          platform,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Trade copiato!',
          description: `${tradeType.toUpperCase()} ${tokenSymbol} per ${data.amountSol} SOL`,
        });
        fetchRecentCopyTrades();
      }

      return data;
    } catch (err) {
      console.error('Copy trade execution error:', err);
      toast({
        title: 'Errore copy trade',
        description: err instanceof Error ? err.message : 'Errore sconosciuto',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, settings, toast, fetchRecentCopyTrades]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchSettings();
    fetchRecentCopyTrades();

    // Subscribe to copy_trades changes
    const channel = supabase
      .channel('copy-trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'copy_trades',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRecentCopyTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSettings, fetchRecentCopyTrades]);

  return {
    settings,
    recentCopyTrades,
    isLoading,
    isSaving,
    updateSettings,
    toggleEnabled,
    executeCopyTrade,
    refetch: fetchRecentCopyTrades,
  };
}

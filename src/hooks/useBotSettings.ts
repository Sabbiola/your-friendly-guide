import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BotSettings {
  user_id: string;
  is_running: boolean;
  auto_trade: boolean;
  paper_mode: boolean;
  max_position_size: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  max_positions: number;
  updated_at: string;
}

const DEFAULT_SETTINGS: Partial<BotSettings> = {
  is_running: false,
  auto_trade: false,
  paper_mode: true,
  max_position_size: 0.1,
  stop_loss_percent: 10,
  take_profit_percent: 20,
  max_positions: 5,
};

export function useBotSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('bot_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        // Create default settings
        const newSettings = { ...DEFAULT_SETTINGS, user_id: user.id };
        const { data: created, error: createError } = await supabase
          .from('bot_settings')
          .insert([newSettings])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(created);
      } else {
        setSettings(data);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching bot settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();

    if (!user) return;

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('bot-settings-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bot_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setSettings(payload.new as BotSettings);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchSettings]);

  const updateSettings = async (updates: Partial<BotSettings>) => {
    if (!user) return { success: false, error: 'No user logged in' };

    try {
      const { data, error: updateError } = await supabase
        .from('bot_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSettings(data);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const toggleBot = async () => {
    if (!settings) return { success: false, error: 'Settings not loaded' };
    return updateSettings({ is_running: !settings.is_running });
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    toggleBot,
    refetch: fetchSettings,
  };
}

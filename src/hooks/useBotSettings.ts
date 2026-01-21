import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BotSettings {
  id: string;
  user_id: string;
  api_key: string;
  stop_loss_percent: number;
  take_profit_percent: number;
  max_position_size_sol: number;
  auto_sell_enabled: boolean;
  telegram_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export function useBotSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bot-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('bot_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as BotSettings | null;
    },
    enabled: !!user,
  });
}

export function useUpdateBotSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<BotSettings>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bot_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-settings'] });
    },
  });
}

export function useRegenerateApiKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bot_settings')
        .update({ api_key: crypto.randomUUID() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-settings'] });
    },
  });
}

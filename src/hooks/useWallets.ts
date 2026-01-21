import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  name: string | null;
  balance_sol: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useWallets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Wallet[];
    },
    enabled: !!user,
  });
}

export function useActiveWallets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallets', 'active', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Wallet[];
    },
    enabled: !!user,
  });
}

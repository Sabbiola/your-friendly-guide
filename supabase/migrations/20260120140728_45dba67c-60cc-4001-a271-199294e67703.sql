-- Create copy_trade_settings table for user preferences
CREATE TABLE public.copy_trade_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  max_position_sol NUMERIC DEFAULT 0.1,
  slippage_percent NUMERIC DEFAULT 1,
  use_jupiter BOOLEAN DEFAULT true,
  use_pumpfun BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create copy_trades table to track executed copy trades
CREATE TABLE public.copy_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_wallet_id UUID REFERENCES public.wallets(id),
  source_signature TEXT NOT NULL,
  token_mint TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  source_amount_sol NUMERIC NOT NULL,
  executed_amount_sol NUMERIC,
  status TEXT DEFAULT 'pending',
  tx_signature TEXT,
  error_message TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.copy_trade_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_trades ENABLE ROW LEVEL SECURITY;

-- RLS policies for copy_trade_settings
CREATE POLICY "Users can view own copy trade settings"
ON public.copy_trade_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own copy trade settings"
ON public.copy_trade_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own copy trade settings"
ON public.copy_trade_settings FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for copy_trades
CREATE POLICY "Users can view own copy trades"
ON public.copy_trades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own copy trades"
ON public.copy_trades FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own copy trades"
ON public.copy_trades FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_copy_trade_settings_updated_at
BEFORE UPDATE ON public.copy_trade_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for copy_trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_trades;
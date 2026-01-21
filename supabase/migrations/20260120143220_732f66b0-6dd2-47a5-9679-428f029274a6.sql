-- Tabella per salvare i filtri dello scanner per ogni utente
CREATE TABLE public.scanner_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Market Cap filters
  min_market_cap NUMERIC DEFAULT 12000,
  max_market_cap NUMERIC DEFAULT 60000,
  -- Age filter
  max_age_minutes INTEGER DEFAULT 30,
  -- Volume filter
  min_volume_usd NUMERIC DEFAULT 15000,
  -- Security filters
  max_dev_holding_percent NUMERIC DEFAULT 5,
  max_insiders_percent NUMERIC DEFAULT 20,
  min_bonding_curve_percent NUMERIC DEFAULT 35,
  min_bot_users INTEGER DEFAULT 10,
  min_fees_percent NUMERIC DEFAULT 0.5,
  -- Refresh rate
  refresh_interval_seconds INTEGER DEFAULT 10,
  -- Platform
  use_pump BOOLEAN DEFAULT true,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scanner_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scanner settings" ON public.scanner_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scanner settings" ON public.scanner_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scanner settings" ON public.scanner_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Tabella per i token trovati dallo scanner (cache temporanea)
CREATE TABLE public.scanned_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mint TEXT NOT NULL,
  name TEXT,
  symbol TEXT,
  -- Price data
  price_usd NUMERIC,
  price_change_5m NUMERIC,
  price_change_1h NUMERIC,
  price_change_24h NUMERIC,
  -- Market data
  market_cap NUMERIC,
  liquidity_usd NUMERIC,
  volume_24h NUMERIC,
  -- Pump.fun specific
  bonding_curve_percent NUMERIC,
  dev_holding_percent NUMERIC,
  insiders_percent NUMERIC,
  -- Holders
  holders_count INTEGER,
  top_10_holders_percent NUMERIC,
  -- Trading data
  buys_24h INTEGER,
  sells_24h INTEGER,
  txns_24h INTEGER,
  bot_users INTEGER,
  -- Token age
  created_at_token TIMESTAMP WITH TIME ZONE,
  age_minutes INTEGER,
  -- Pair info
  pair_address TEXT,
  dex_id TEXT,
  -- Score (calculated)
  risk_score INTEGER,
  -- Timestamps
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, mint)
);

-- Enable RLS
ALTER TABLE public.scanned_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scanned tokens" ON public.scanned_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scanned tokens" ON public.scanned_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scanned tokens" ON public.scanned_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scanned tokens" ON public.scanned_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Index per performance
CREATE INDEX idx_scanned_tokens_user_scanned ON public.scanned_tokens(user_id, scanned_at DESC);
CREATE INDEX idx_scanned_tokens_mint ON public.scanned_tokens(mint);
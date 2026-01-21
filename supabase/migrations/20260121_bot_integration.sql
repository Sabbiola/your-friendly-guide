-- Bot Integration Schema
-- Add tables for bot data sync with dashboard

-- Trades table (bot trading history)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  mint TEXT NOT NULL,
  symbol TEXT,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  price DECIMAL NOT NULL,
  amount DECIMAL NOT NULL,
  pnl DECIMAL DEFAULT 0,
  pnl_percent DECIMAL,
  tx_hash TEXT,
  traded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions table (current open positions)
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  mint TEXT NOT NULL,
  symbol TEXT,
  entry_price DECIMAL NOT NULL,
  current_price DECIMAL,
  amount DECIMAL NOT NULL,
  pnl DECIMAL DEFAULT 0,
  pnl_percent DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mint, status)
);

-- Bot settings table (control bot from dashboard)
CREATE TABLE IF NOT EXISTS public.bot_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  is_running BOOLEAN DEFAULT false,
  auto_trade BOOLEAN DEFAULT false,
  paper_mode BOOLEAN DEFAULT true,
  max_position_size DECIMAL DEFAULT 0.1,
  stop_loss_percent DECIMAL DEFAULT 10,
  take_profit_percent DECIMAL DEFAULT 20,
  max_positions INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_traded_at ON public.trades(user_id, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_user_status ON public.positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_mint ON public.trades(mint);

-- Row Level Security (RLS)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own trades" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own positions" ON public.positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own positions" ON public.positions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bot settings" ON public.bot_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own bot settings" ON public.bot_settings
  FOR ALL USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_settings_updated_at BEFORE UPDATE ON public.bot_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

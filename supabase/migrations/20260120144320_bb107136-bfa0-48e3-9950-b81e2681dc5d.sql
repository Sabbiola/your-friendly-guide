-- Add new columns to positions table for scanner trading and automated SL/TP
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS entry_price numeric,
ADD COLUMN IF NOT EXISTS stop_loss_percent numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS take_profit_percent numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add comment for clarity
COMMENT ON COLUMN public.positions.source IS 'Trade source: manual, scanner, copy';
COMMENT ON COLUMN public.positions.entry_price IS 'Token price at entry in USD';
COMMENT ON COLUMN public.positions.stop_loss_percent IS 'Auto-sell when loss exceeds this %';
COMMENT ON COLUMN public.positions.take_profit_percent IS 'Auto-sell when profit exceeds this %';
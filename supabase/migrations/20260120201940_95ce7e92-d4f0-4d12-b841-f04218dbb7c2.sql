-- Create logs table for bot logging
CREATE TABLE public.logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'INFO',
  module TEXT NOT NULL DEFAULT 'system',
  message TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own logs" ON public.logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON public.logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow API key based inserts (for bot)
CREATE POLICY "Allow insert via service role" ON public.logs
  FOR INSERT WITH CHECK (true);

-- Enable realtime for live log streaming
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;

-- Create index for faster queries
CREATE INDEX idx_logs_user_created ON public.logs(user_id, created_at DESC);
CREATE INDEX idx_logs_level ON public.logs(level);
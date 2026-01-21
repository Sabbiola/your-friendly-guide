-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow insert via service role" ON public.logs;

-- Create a proper policy that checks for API key authentication
-- The bot will use service_role key which bypasses RLS anyway
-- So we just need the user-based policies
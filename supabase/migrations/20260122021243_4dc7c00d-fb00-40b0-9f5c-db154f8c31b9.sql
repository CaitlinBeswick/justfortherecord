-- Create table to log digest email sends
CREATE TABLE public.digest_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_failed INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  is_test BOOLEAN NOT NULL DEFAULT false,
  triggered_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.digest_email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can read digest logs"
  ON public.digest_email_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts (handled in edge function)
CREATE POLICY "Service can insert digest logs"
  ON public.digest_email_logs
  FOR INSERT
  WITH CHECK (true);

-- Update default for app_updates to be inactive by default
ALTER TABLE public.app_updates ALTER COLUMN is_active SET DEFAULT false;
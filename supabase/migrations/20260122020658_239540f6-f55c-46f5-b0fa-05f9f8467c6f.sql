-- Create table to store digest email template settings
CREATE TABLE public.digest_email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT 'Your Weekly Digest from Just For The Record',
  greeting TEXT NOT NULL DEFAULT 'Hey {userName}, here''s what happened this week',
  custom_note TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Open Just For The Record',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.digest_email_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can read digest settings"
  ON public.digest_email_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert digest settings"
  ON public.digest_email_settings
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update digest settings"
  ON public.digest_email_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.digest_email_settings (subject, greeting, cta_text)
VALUES (
  'Your Weekly Digest from Just For The Record',
  'Hey {userName}, here''s what happened this week',
  'Open Just For The Record'
);

-- Add trigger for updated_at
CREATE TRIGGER update_digest_email_settings_updated_at
  BEFORE UPDATE ON public.digest_email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
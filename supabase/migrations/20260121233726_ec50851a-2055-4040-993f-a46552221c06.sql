-- Create table to store app updates/features for weekly digest
CREATE TABLE public.app_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Everyone can read app updates
CREATE POLICY "App updates are publicly readable"
  ON public.app_updates
  FOR SELECT
  USING (true);

-- Only admins can manage app updates
CREATE POLICY "Admins can insert app updates"
  ON public.app_updates
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update app updates"
  ON public.app_updates
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete app updates"
  ON public.app_updates
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
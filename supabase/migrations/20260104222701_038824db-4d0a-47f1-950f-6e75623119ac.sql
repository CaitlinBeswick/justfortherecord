-- Create table for user-added releases (releases not in the default discography that user wants to include)
CREATE TABLE public.release_inclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artist_id TEXT NOT NULL,
  release_group_id TEXT NOT NULL,
  release_title TEXT NOT NULL,
  release_type TEXT,
  release_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, release_group_id)
);

-- Enable RLS
ALTER TABLE public.release_inclusions ENABLE ROW LEVEL SECURITY;

-- Users can view their own inclusions
CREATE POLICY "Users can view their own release inclusions"
ON public.release_inclusions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own inclusions
CREATE POLICY "Users can add their own release inclusions"
ON public.release_inclusions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own inclusions
CREATE POLICY "Users can delete their own release inclusions"
ON public.release_inclusions
FOR DELETE
USING (auth.uid() = user_id);
-- Create artist_follows table for tracking which artists users follow
CREATE TABLE public.artist_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, artist_id)
);

-- Enable Row Level Security
ALTER TABLE public.artist_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own follows"
  ON public.artist_follows
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows"
  ON public.artist_follows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
  ON public.artist_follows
  FOR DELETE
  USING (auth.uid() = user_id);
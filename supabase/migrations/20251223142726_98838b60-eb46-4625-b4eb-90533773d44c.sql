-- Create artist_ratings table
CREATE TABLE public.artist_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  rating NUMERIC NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, artist_id)
);

-- Enable RLS
ALTER TABLE public.artist_ratings ENABLE ROW LEVEL SECURITY;

-- Ratings are viewable by everyone
CREATE POLICY "Artist ratings are viewable by everyone"
ON public.artist_ratings
FOR SELECT
USING (true);

-- Users can insert their own ratings
CREATE POLICY "Users can insert their own artist ratings"
ON public.artist_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update their own artist ratings"
ON public.artist_ratings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own artist ratings"
ON public.artist_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_artist_ratings_artist_id ON public.artist_ratings(artist_id);
CREATE INDEX idx_artist_ratings_user_id ON public.artist_ratings(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_artist_ratings_updated_at
BEFORE UPDATE ON public.artist_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
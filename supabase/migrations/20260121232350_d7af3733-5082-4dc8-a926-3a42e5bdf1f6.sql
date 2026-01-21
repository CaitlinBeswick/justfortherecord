-- Create a cache table for artist images
CREATE TABLE public.artist_image_cache (
  artist_id TEXT PRIMARY KEY,
  image_url TEXT,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artist_image_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached images
CREATE POLICY "Artist images are publicly readable"
ON public.artist_image_cache
FOR SELECT
USING (true);

-- Authenticated users can insert cache entries
CREATE POLICY "Authenticated users can cache artist images"
ON public.artist_image_cache
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update cache entries (for refreshing stale cache)
CREATE POLICY "Authenticated users can update artist image cache"
ON public.artist_image_cache
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add index for faster lookups
CREATE INDEX idx_artist_image_cache_checked_at ON public.artist_image_cache(checked_at);
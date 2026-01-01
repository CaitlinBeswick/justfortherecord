-- Create a cache table for release group official status
CREATE TABLE public.release_group_official_cache (
  release_group_id text PRIMARY KEY,
  is_official boolean NOT NULL,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.release_group_official_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cache (public data)
CREATE POLICY "Cache is viewable by everyone" 
ON public.release_group_official_cache 
FOR SELECT 
USING (true);

-- Allow anyone to insert into cache (populate on first check)
CREATE POLICY "Anyone can insert cache entries" 
ON public.release_group_official_cache 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_release_group_cache_checked_at ON public.release_group_official_cache(checked_at);
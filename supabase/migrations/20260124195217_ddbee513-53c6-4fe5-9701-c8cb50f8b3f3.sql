-- Cache of MusicBrainz release groups by artist to speed up New Releases page
CREATE TABLE IF NOT EXISTS public.artist_release_cache (
  artist_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_release_cache ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cached music data (public, non-sensitive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'artist_release_cache' 
      AND policyname = 'Authenticated users can read artist release cache'
  ) THEN
    CREATE POLICY "Authenticated users can read artist release cache"
    ON public.artist_release_cache
    FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_artist_release_cache_fetched_at
  ON public.artist_release_cache (fetched_at DESC);
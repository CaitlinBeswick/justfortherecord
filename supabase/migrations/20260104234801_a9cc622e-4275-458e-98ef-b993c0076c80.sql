-- Add secondary_types column to release_inclusions table
ALTER TABLE public.release_inclusions 
ADD COLUMN secondary_types text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.release_inclusions.secondary_types IS 'Array of MusicBrainz secondary types like Live, Compilation, Soundtrack, etc.';
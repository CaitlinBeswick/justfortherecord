-- Public aggregates for leaderboards (safe for signed-out users)

-- 1) Album aggregates
CREATE TABLE IF NOT EXISTS public.album_ratings_agg (
  release_group_id text PRIMARY KEY,
  album_title text NOT NULL,
  artist_name text NOT NULL,
  avg_rating numeric NOT NULL,
  rating_count integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.album_ratings_agg ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'album_ratings_agg' 
      AND policyname = 'Album rating aggregates are publicly readable'
  ) THEN
    CREATE POLICY "Album rating aggregates are publicly readable"
    ON public.album_ratings_agg
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- 2) Artist aggregates
CREATE TABLE IF NOT EXISTS public.artist_ratings_agg (
  artist_id text PRIMARY KEY,
  artist_name text NOT NULL,
  avg_rating numeric NOT NULL,
  rating_count integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_ratings_agg ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'artist_ratings_agg' 
      AND policyname = 'Artist rating aggregates are publicly readable'
  ) THEN
    CREATE POLICY "Artist rating aggregates are publicly readable"
    ON public.artist_ratings_agg
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- 3) Trigger functions to keep aggregates updated
CREATE OR REPLACE FUNCTION public.refresh_album_ratings_agg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rgid text;
  ids text[];
BEGIN
  ids := ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[OLD.release_group_id, NEW.release_group_id]) AS x WHERE x IS NOT NULL);

  FOREACH rgid IN ARRAY ids LOOP
    -- If there are no ratings left, remove aggregate
    IF NOT EXISTS (SELECT 1 FROM public.album_ratings WHERE release_group_id = rgid) THEN
      DELETE FROM public.album_ratings_agg WHERE release_group_id = rgid;
    ELSE
      INSERT INTO public.album_ratings_agg (release_group_id, album_title, artist_name, avg_rating, rating_count, updated_at)
      SELECT
        ar.release_group_id,
        max(ar.album_title) AS album_title,
        max(ar.artist_name) AS artist_name,
        avg(ar.rating)::numeric AS avg_rating,
        count(*)::int AS rating_count,
        now() AS updated_at
      FROM public.album_ratings ar
      WHERE ar.release_group_id = rgid
      GROUP BY ar.release_group_id
      ON CONFLICT (release_group_id)
      DO UPDATE SET
        album_title = EXCLUDED.album_title,
        artist_name = EXCLUDED.artist_name,
        avg_rating = EXCLUDED.avg_rating,
        rating_count = EXCLUDED.rating_count,
        updated_at = EXCLUDED.updated_at;
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_artist_ratings_agg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  aid text;
  ids text[];
BEGIN
  ids := ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[OLD.artist_id, NEW.artist_id]) AS x WHERE x IS NOT NULL);

  FOREACH aid IN ARRAY ids LOOP
    IF NOT EXISTS (SELECT 1 FROM public.artist_ratings WHERE artist_id = aid) THEN
      DELETE FROM public.artist_ratings_agg WHERE artist_id = aid;
    ELSE
      INSERT INTO public.artist_ratings_agg (artist_id, artist_name, avg_rating, rating_count, updated_at)
      SELECT
        ar.artist_id,
        max(ar.artist_name) AS artist_name,
        avg(ar.rating)::numeric AS avg_rating,
        count(*)::int AS rating_count,
        now() AS updated_at
      FROM public.artist_ratings ar
      WHERE ar.artist_id = aid
      GROUP BY ar.artist_id
      ON CONFLICT (artist_id)
      DO UPDATE SET
        artist_name = EXCLUDED.artist_name,
        avg_rating = EXCLUDED.avg_rating,
        rating_count = EXCLUDED.rating_count,
        updated_at = EXCLUDED.updated_at;
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Triggers
DROP TRIGGER IF EXISTS trg_refresh_album_ratings_agg ON public.album_ratings;
CREATE TRIGGER trg_refresh_album_ratings_agg
AFTER INSERT OR UPDATE OR DELETE ON public.album_ratings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_album_ratings_agg();

DROP TRIGGER IF EXISTS trg_refresh_artist_ratings_agg ON public.artist_ratings;
CREATE TRIGGER trg_refresh_artist_ratings_agg
AFTER INSERT OR UPDATE OR DELETE ON public.artist_ratings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_artist_ratings_agg();

-- 5) Backfill aggregates from existing data
INSERT INTO public.album_ratings_agg (release_group_id, album_title, artist_name, avg_rating, rating_count)
SELECT
  release_group_id,
  max(album_title) AS album_title,
  max(artist_name) AS artist_name,
  avg(rating)::numeric AS avg_rating,
  count(*)::int AS rating_count
FROM public.album_ratings
GROUP BY release_group_id
ON CONFLICT (release_group_id) DO UPDATE SET
  album_title = EXCLUDED.album_title,
  artist_name = EXCLUDED.artist_name,
  avg_rating = EXCLUDED.avg_rating,
  rating_count = EXCLUDED.rating_count,
  updated_at = now();

INSERT INTO public.artist_ratings_agg (artist_id, artist_name, avg_rating, rating_count)
SELECT
  artist_id,
  max(artist_name) AS artist_name,
  avg(rating)::numeric AS avg_rating,
  count(*)::int AS rating_count
FROM public.artist_ratings
GROUP BY artist_id
ON CONFLICT (artist_id) DO UPDATE SET
  artist_name = EXCLUDED.artist_name,
  avg_rating = EXCLUDED.avg_rating,
  rating_count = EXCLUDED.rating_count,
  updated_at = now();

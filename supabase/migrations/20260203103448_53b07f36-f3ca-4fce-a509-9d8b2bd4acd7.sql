-- Fix the artist_ratings_agg trigger function to run with elevated privileges
CREATE OR REPLACE FUNCTION public.refresh_artist_ratings_agg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Also fix the album_ratings_agg trigger function
CREATE OR REPLACE FUNCTION public.refresh_album_ratings_agg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
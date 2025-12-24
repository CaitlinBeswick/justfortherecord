-- Add release_date column to album_ratings table
ALTER TABLE public.album_ratings 
ADD COLUMN release_date text;
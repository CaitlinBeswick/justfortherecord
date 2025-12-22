-- Add loved column to album_ratings table
ALTER TABLE public.album_ratings ADD COLUMN loved boolean NOT NULL DEFAULT false;
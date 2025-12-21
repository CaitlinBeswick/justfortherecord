-- Change rating column from integer to numeric to support 0.5 increments
ALTER TABLE public.album_ratings 
ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric(2,1);
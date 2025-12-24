-- Add rating column to diary_entries
ALTER TABLE public.diary_entries 
ADD COLUMN rating numeric NULL;
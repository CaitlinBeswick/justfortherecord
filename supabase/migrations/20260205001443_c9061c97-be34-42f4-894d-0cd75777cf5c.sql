-- Add tags column to diary_entries for format tags (vinyl, CD, digital, etc.)
ALTER TABLE public.diary_entries 
ADD COLUMN tags text[] DEFAULT '{}';

-- Create an index for efficient tag searching
CREATE INDEX idx_diary_entries_tags ON public.diary_entries USING GIN(tags);
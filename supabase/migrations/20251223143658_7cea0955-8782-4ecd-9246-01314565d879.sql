-- Create diary_entries table for tracking listens and re-listens
CREATE TABLE public.diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  release_group_id TEXT NOT NULL,
  album_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  listened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  is_relisten BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own diary entries
CREATE POLICY "Users can view their own diary entries"
ON public.diary_entries
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own diary entries
CREATE POLICY "Users can insert their own diary entries"
ON public.diary_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own diary entries
CREATE POLICY "Users can update their own diary entries"
ON public.diary_entries
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own diary entries
CREATE POLICY "Users can delete their own diary entries"
ON public.diary_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_diary_entries_user_id ON public.diary_entries(user_id);
CREATE INDEX idx_diary_entries_listened_on ON public.diary_entries(user_id, listened_on DESC);
CREATE INDEX idx_diary_entries_release ON public.diary_entries(user_id, release_group_id);
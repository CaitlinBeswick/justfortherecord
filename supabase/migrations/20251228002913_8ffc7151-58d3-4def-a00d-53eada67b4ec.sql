-- Create table for favorite albums (top 5)
CREATE TABLE public.favorite_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  release_group_id TEXT NOT NULL,
  album_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, position),
  UNIQUE (user_id, release_group_id)
);

-- Enable RLS
ALTER TABLE public.favorite_albums ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Favorite albums are viewable by everyone"
ON public.favorite_albums
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own favorite albums"
ON public.favorite_albums
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite albums"
ON public.favorite_albums
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite albums"
ON public.favorite_albums
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_favorite_albums_updated_at
BEFORE UPDATE ON public.favorite_albums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
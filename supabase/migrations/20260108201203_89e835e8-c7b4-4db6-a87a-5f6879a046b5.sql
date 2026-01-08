-- Create a table to store user's visible release types per artist
CREATE TABLE public.artist_release_type_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  artist_id TEXT NOT NULL,
  visible_types TEXT[] NOT NULL DEFAULT ARRAY['Album']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, artist_id)
);

-- Enable Row Level Security
ALTER TABLE public.artist_release_type_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own release type preferences" 
ON public.artist_release_type_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own release type preferences" 
ON public.artist_release_type_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own release type preferences" 
ON public.artist_release_type_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own release type preferences" 
ON public.artist_release_type_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_artist_release_type_preferences_updated_at
BEFORE UPDATE ON public.artist_release_type_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
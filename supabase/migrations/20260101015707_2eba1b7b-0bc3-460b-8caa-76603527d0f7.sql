-- Create table for manually overriding release group visibility
-- This allows users to hide unofficial releases that slip through or show hidden official ones
CREATE TABLE public.release_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  release_group_id TEXT NOT NULL,
  artist_id TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, release_group_id)
);

-- Enable Row Level Security
ALTER TABLE public.release_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own overrides" 
ON public.release_overrides 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own overrides" 
ON public.release_overrides 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overrides" 
ON public.release_overrides 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides" 
ON public.release_overrides 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_release_overrides_updated_at
BEFORE UPDATE ON public.release_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
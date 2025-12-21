-- Create listening_status table for tracking 'listened' and 'to_listen' status
CREATE TABLE public.listening_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  release_group_id text NOT NULL,
  album_title text NOT NULL,
  artist_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('listened', 'to_listen')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, release_group_id)
);

-- Enable Row Level Security
ALTER TABLE public.listening_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Listening status viewable by everyone"
ON public.listening_status
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own listening status"
ON public.listening_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listening status"
ON public.listening_status
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listening status"
ON public.listening_status
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_listening_status_updated_at
BEFORE UPDATE ON public.listening_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
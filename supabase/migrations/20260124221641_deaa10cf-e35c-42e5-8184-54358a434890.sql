-- Create table to store recommendation history
CREATE TABLE public.recommendation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT,
  albums JSONB NOT NULL DEFAULT '[]'::jsonb,
  artists JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view their own recommendation history"
ON public.recommendation_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert their own recommendation history"
ON public.recommendation_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete their own recommendation history"
ON public.recommendation_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_recommendation_history_user_created 
ON public.recommendation_history(user_id, created_at DESC);
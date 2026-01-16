-- Create table to store yearly listening goals for each year
CREATE TABLE public.yearly_listening_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  goal INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_year UNIQUE (user_id, year)
);

-- Enable Row Level Security
ALTER TABLE public.yearly_listening_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own goals"
ON public.yearly_listening_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON public.yearly_listening_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.yearly_listening_goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
ON public.yearly_listening_goals
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for timestamp updates
CREATE TRIGGER update_yearly_listening_goals_updated_at
BEFORE UPDATE ON public.yearly_listening_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
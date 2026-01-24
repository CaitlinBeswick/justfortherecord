-- Add column for AI recommendation preference to include familiar content
ALTER TABLE public.profiles
ADD COLUMN ai_include_familiar boolean NOT NULL DEFAULT false;
-- Add default_release_types column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN default_release_types text[] NOT NULL DEFAULT ARRAY['Album'];
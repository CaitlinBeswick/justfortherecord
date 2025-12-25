-- Add is_loved column to listening_status table
ALTER TABLE public.listening_status 
ADD COLUMN is_loved boolean NOT NULL DEFAULT false;
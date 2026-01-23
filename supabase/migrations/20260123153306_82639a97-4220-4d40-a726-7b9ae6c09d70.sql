-- Add column to track when an app update was broadcasted
ALTER TABLE public.app_updates 
ADD COLUMN broadcasted_at timestamp with time zone DEFAULT NULL;

-- Add column to track how many users received the broadcast
ALTER TABLE public.app_updates 
ADD COLUMN broadcast_count integer DEFAULT 0;
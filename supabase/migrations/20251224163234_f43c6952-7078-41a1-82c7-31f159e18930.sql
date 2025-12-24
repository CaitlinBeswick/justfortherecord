-- Add new boolean columns for listening status
ALTER TABLE public.listening_status 
ADD COLUMN is_listened boolean NOT NULL DEFAULT false,
ADD COLUMN is_to_listen boolean NOT NULL DEFAULT false;

-- Migrate existing data
UPDATE public.listening_status 
SET is_listened = true 
WHERE status = 'listened';

UPDATE public.listening_status 
SET is_to_listen = true 
WHERE status = 'to_listen';

-- Drop the old status column
ALTER TABLE public.listening_status 
DROP COLUMN status;
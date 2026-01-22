-- Add link column to app_updates for navigation
ALTER TABLE public.app_updates 
ADD COLUMN link text DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.app_updates.link IS 'Relative URL path to navigate to when clicking the update (e.g., /profile/settings)';
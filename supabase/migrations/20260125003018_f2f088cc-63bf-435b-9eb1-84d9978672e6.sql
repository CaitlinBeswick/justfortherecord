-- Create a view for searchable profiles that only exposes minimal data for users who allow discovery
-- This prevents enumeration of private profiles while still allowing user search functionality

CREATE OR REPLACE VIEW public.searchable_profiles
WITH (security_invoker=on) AS
SELECT 
  id,
  username,
  display_name,
  avatar_url
FROM public.profiles
WHERE 
  -- Only include profiles that are public or friends_only (discoverable)
  -- Exclude completely private profiles (is_public = false AND friends_only = false)
  (is_public = true OR friends_only = true)
  -- Only include profiles that allow friend requests (willing to be discovered)
  AND allow_friend_requests = true;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.searchable_profiles TO authenticated;

COMMENT ON VIEW public.searchable_profiles IS 'A restricted view of profiles that only exposes discoverable users who allow friend requests. Used for user search to prevent enumeration of private profiles.';
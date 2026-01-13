-- Update can_view_profile to require authentication
-- Anonymous users (NULL viewer_id) will not be able to view any profiles
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_user_id uuid, viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      -- CRITICAL: Require authentication - deny access if viewer is not logged in
      WHEN viewer_id IS NULL THEN false
      -- If viewer is blocked by profile owner, deny access
      WHEN public.is_blocked(profile_user_id, viewer_id) THEN false
      -- Owner can always see their own profile
      WHEN profile_user_id = viewer_id THEN true
      -- Check if profile is public
      WHEN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = profile_user_id AND is_public = true AND friends_only = false
      ) THEN true
      -- Check if friends_only and viewer is a friend
      WHEN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = profile_user_id AND friends_only = true
      ) AND EXISTS (
        SELECT 1 FROM public.friendships
        WHERE status = 'accepted'
        AND ((requester_id = profile_user_id AND addressee_id = viewer_id)
          OR (addressee_id = profile_user_id AND requester_id = viewer_id))
      ) THEN true
      -- Private profile, not a friend
      ELSE false
    END
$$;
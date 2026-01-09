-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

-- Users can unblock
CREATE POLICY "Users can unblock"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create helper function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(blocker_user_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = blocker_user_id AND blocked_id = target_user_id
  )
$$;

-- Update can_view_profile to check for blocks
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_user_id uuid, viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- If viewer is blocked by profile owner, deny access
      WHEN public.is_blocked(profile_user_id, viewer_id) THEN false
      -- If viewer has blocked profile owner, still allow viewing (optional)
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

-- Update friendships insert policy to also check for blocks
DROP POLICY IF EXISTS "Users can send friend requests if allowed" ON public.friendships;
CREATE POLICY "Users can send friend requests if allowed"
ON public.friendships
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND NOT public.is_blocked(addressee_id, auth.uid())
  AND NOT public.is_blocked(auth.uid(), addressee_id)
  AND (
    SELECT allow_friend_requests FROM public.profiles WHERE id = addressee_id
  ) = true
);
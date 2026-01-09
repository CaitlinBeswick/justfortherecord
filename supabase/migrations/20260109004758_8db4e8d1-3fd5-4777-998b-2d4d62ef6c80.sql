-- Add privacy columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_public boolean NOT NULL DEFAULT true,
ADD COLUMN friends_only boolean NOT NULL DEFAULT false,
ADD COLUMN show_albums boolean NOT NULL DEFAULT true,
ADD COLUMN show_artists boolean NOT NULL DEFAULT true,
ADD COLUMN show_diary boolean NOT NULL DEFAULT true,
ADD COLUMN show_lists boolean NOT NULL DEFAULT true,
ADD COLUMN show_friends_count boolean NOT NULL DEFAULT true,
ADD COLUMN show_friends_list boolean NOT NULL DEFAULT true,
ADD COLUMN allow_friend_requests boolean NOT NULL DEFAULT true;

-- Update RLS policy for profiles to respect privacy settings
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a function to check if viewer can see profile
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_user_id uuid, viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
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

-- New policy: Profiles viewable based on privacy settings
CREATE POLICY "Profiles viewable based on privacy"
ON public.profiles
FOR SELECT
USING (
  can_view_profile(id, auth.uid())
);

-- Update RLS for listening_status to respect profile privacy
DROP POLICY IF EXISTS "Listening status viewable by everyone" ON public.listening_status;
CREATE POLICY "Listening status viewable based on profile privacy"
ON public.listening_status
FOR SELECT
USING (
  user_id = auth.uid() OR can_view_profile(user_id, auth.uid())
);

-- Update RLS for album_ratings to respect profile privacy
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.album_ratings;
CREATE POLICY "Ratings viewable based on profile privacy"
ON public.album_ratings
FOR SELECT
USING (
  user_id = auth.uid() OR can_view_profile(user_id, auth.uid())
);

-- Update RLS for artist_ratings to respect profile privacy
DROP POLICY IF EXISTS "Artist ratings are viewable by everyone" ON public.artist_ratings;
CREATE POLICY "Artist ratings viewable based on profile privacy"
ON public.artist_ratings
FOR SELECT
USING (
  user_id = auth.uid() OR can_view_profile(user_id, auth.uid())
);

-- Update RLS for diary_entries to respect profile privacy
DROP POLICY IF EXISTS "Diary entries are viewable by everyone" ON public.diary_entries;
CREATE POLICY "Diary entries viewable based on profile privacy"
ON public.diary_entries
FOR SELECT
USING (
  user_id = auth.uid() OR can_view_profile(user_id, auth.uid())
);

-- Update RLS for favorite_albums to respect profile privacy
DROP POLICY IF EXISTS "Favorite albums are viewable by everyone" ON public.favorite_albums;
CREATE POLICY "Favorite albums viewable based on profile privacy"
ON public.favorite_albums
FOR SELECT
USING (
  user_id = auth.uid() OR can_view_profile(user_id, auth.uid())
);

-- Update friendships insert policy to respect allow_friend_requests
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests if allowed"
ON public.friendships
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND (
    SELECT allow_friend_requests FROM public.profiles WHERE id = addressee_id
  ) = true
);
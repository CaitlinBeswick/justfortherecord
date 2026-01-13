-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Favorite albums viewable based on profile privacy" ON public.favorite_albums;

-- Create updated SELECT policy that requires authentication
-- Users can only see their own favorites, or other users' favorites if they're logged in AND can view that profile
CREATE POLICY "Favorite albums viewable based on profile privacy"
ON public.favorite_albums
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR 
  (auth.uid() IS NOT NULL AND can_view_profile(user_id, auth.uid()))
);
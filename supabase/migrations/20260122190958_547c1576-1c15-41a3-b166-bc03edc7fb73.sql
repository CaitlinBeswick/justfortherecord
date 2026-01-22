-- Create activity_likes table for liking friend activity items
CREATE TABLE public.activity_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Reference to the type of activity
  activity_type TEXT NOT NULL CHECK (activity_type IN ('diary_entry', 'album_rating', 'artist_follow')),
  -- The ID of the activity item being liked
  activity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate likes
CREATE UNIQUE INDEX idx_activity_likes_unique ON public.activity_likes (user_id, activity_type, activity_id);

-- Create index for efficient lookups
CREATE INDEX idx_activity_likes_activity ON public.activity_likes (activity_type, activity_id);

-- Enable RLS
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;

-- Users can view likes on activities they can see (friends' activities)
CREATE POLICY "Users can view activity likes"
ON public.activity_likes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can like activities
CREATE POLICY "Users can like activities"
ON public.activity_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike activities"
ON public.activity_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create activity_comments table for commenting on friend activity items
CREATE TABLE public.activity_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Reference to the type of activity
  activity_type TEXT NOT NULL CHECK (activity_type IN ('diary_entry', 'album_rating', 'artist_follow')),
  -- The ID of the activity item being commented on
  activity_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_activity_comments_activity ON public.activity_comments (activity_type, activity_id);
CREATE INDEX idx_activity_comments_user ON public.activity_comments (user_id);

-- Enable RLS
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on activities they can see
CREATE POLICY "Users can view activity comments"
ON public.activity_comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can comment on activities
CREATE POLICY "Users can comment on activities"
ON public.activity_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.activity_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.activity_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger for comments
CREATE TRIGGER update_activity_comments_updated_at
BEFORE UPDATE ON public.activity_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
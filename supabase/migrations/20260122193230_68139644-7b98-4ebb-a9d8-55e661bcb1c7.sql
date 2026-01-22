-- Add parent_comment_id to support replies to comments
ALTER TABLE public.activity_comments 
ADD COLUMN parent_comment_id UUID REFERENCES public.activity_comments(id) ON DELETE CASCADE;

-- Create index for efficient reply lookups
CREATE INDEX idx_activity_comments_parent ON public.activity_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
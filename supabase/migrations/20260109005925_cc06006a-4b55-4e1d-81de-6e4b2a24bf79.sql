-- Add yearly listen goal to profiles
ALTER TABLE public.profiles
ADD COLUMN yearly_listen_goal integer DEFAULT NULL;
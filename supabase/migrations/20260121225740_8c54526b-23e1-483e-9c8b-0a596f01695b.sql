-- Add weekly digest preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN email_weekly_digest boolean NOT NULL DEFAULT false;
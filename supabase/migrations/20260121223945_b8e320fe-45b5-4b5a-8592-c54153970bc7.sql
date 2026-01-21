-- Add email notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_notifications_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN email_new_releases boolean NOT NULL DEFAULT true,
ADD COLUMN email_friend_requests boolean NOT NULL DEFAULT true,
ADD COLUMN email_friend_activity boolean NOT NULL DEFAULT false;
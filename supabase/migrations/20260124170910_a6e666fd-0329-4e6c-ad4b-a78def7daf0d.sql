-- Add granular push notification preference columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_new_releases boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_friend_requests boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_friend_activity boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS push_weekly_digest boolean NOT NULL DEFAULT false;
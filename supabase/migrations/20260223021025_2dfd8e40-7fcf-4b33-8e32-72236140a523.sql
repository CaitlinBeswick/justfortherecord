ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS show_queue boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_following boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_reviews boolean DEFAULT true;
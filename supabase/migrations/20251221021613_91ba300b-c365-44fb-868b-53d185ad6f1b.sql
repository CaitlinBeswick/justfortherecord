-- Create profiles table for extended user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  favorite_genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create album_ratings table (1-5 stars with optional review)
CREATE TABLE public.album_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_group_id TEXT NOT NULL,
  album_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, release_group_id)
);

-- Enable RLS on album_ratings
ALTER TABLE public.album_ratings ENABLE ROW LEVEL SECURITY;

-- Ratings are viewable by everyone
CREATE POLICY "Ratings are viewable by everyone" 
ON public.album_ratings FOR SELECT 
USING (true);

-- Users can insert their own ratings
CREATE POLICY "Users can insert their own ratings" 
ON public.album_ratings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings" 
ON public.album_ratings FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings" 
ON public.album_ratings FOR DELETE 
USING (auth.uid() = user_id);

-- Create user_lists table
CREATE TABLE public.user_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true NOT NULL,
  is_ranked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on user_lists
ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;

-- Public lists are viewable by everyone, private lists only by owner
CREATE POLICY "Public lists are viewable by everyone" 
ON public.user_lists FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

-- Users can insert their own lists
CREATE POLICY "Users can insert their own lists" 
ON public.user_lists FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own lists
CREATE POLICY "Users can update their own lists" 
ON public.user_lists FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own lists
CREATE POLICY "Users can delete their own lists" 
ON public.user_lists FOR DELETE 
USING (auth.uid() = user_id);

-- Create list_items table
CREATE TABLE public.list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.user_lists(id) ON DELETE CASCADE,
  release_group_id TEXT NOT NULL,
  album_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  position INTEGER,
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(list_id, release_group_id)
);

-- Enable RLS on list_items
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- List items inherit visibility from their parent list
CREATE POLICY "List items viewable based on list visibility" 
ON public.list_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_lists 
    WHERE user_lists.id = list_items.list_id 
    AND (user_lists.is_public = true OR user_lists.user_id = auth.uid())
  )
);

-- Users can insert items into their own lists
CREATE POLICY "Users can insert items into their own lists" 
ON public.list_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_lists 
    WHERE user_lists.id = list_items.list_id 
    AND user_lists.user_id = auth.uid()
  )
);

-- Users can update items in their own lists
CREATE POLICY "Users can update items in their own lists" 
ON public.list_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_lists 
    WHERE user_lists.id = list_items.list_id 
    AND user_lists.user_id = auth.uid()
  )
);

-- Users can delete items from their own lists
CREATE POLICY "Users can delete items from their own lists" 
ON public.list_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_lists 
    WHERE user_lists.id = list_items.list_id 
    AND user_lists.user_id = auth.uid()
  )
);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_album_ratings_updated_at
  BEFORE UPDATE ON public.album_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_lists_updated_at
  BEFORE UPDATE ON public.user_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_album_ratings_user_id ON public.album_ratings(user_id);
CREATE INDEX idx_album_ratings_release_group ON public.album_ratings(release_group_id);
CREATE INDEX idx_user_lists_user_id ON public.user_lists(user_id);
CREATE INDEX idx_list_items_list_id ON public.list_items(list_id);
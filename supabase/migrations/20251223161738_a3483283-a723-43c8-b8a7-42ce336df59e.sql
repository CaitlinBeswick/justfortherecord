-- Update diary_entries to be viewable by everyone (like album_ratings)
DROP POLICY IF EXISTS "Users can view their own diary entries" ON public.diary_entries;

CREATE POLICY "Diary entries are viewable by everyone"
ON public.diary_entries
FOR SELECT
USING (true);
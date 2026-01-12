-- Insert a notification for all existing users about the listening goal feature
INSERT INTO public.notifications (user_id, type, title, message, data)
SELECT 
  id as user_id,
  'feature_announcement' as type,
  '🎯 New Feature: Listening Goals!' as title,
  'Set a yearly listening goal and track your progress! Head to your Diary to get started.' as message,
  '{"feature": "listening_goal", "link": "/profile/diary"}'::jsonb as data
FROM public.profiles;
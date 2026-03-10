CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  location text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.location, p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;
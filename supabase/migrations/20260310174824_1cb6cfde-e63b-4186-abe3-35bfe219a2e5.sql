CREATE OR REPLACE FUNCTION public.get_total_user_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles;
$$;
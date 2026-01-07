-- Fix overly permissive RLS policy on release_group_official_cache
-- Currently allows anyone to insert cache entries (WITH CHECK: true)
-- Change to only allow authenticated users to insert

DROP POLICY IF EXISTS "Anyone can insert cache entries" ON public.release_group_official_cache;

CREATE POLICY "Authenticated users can insert cache entries" 
ON public.release_group_official_cache 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
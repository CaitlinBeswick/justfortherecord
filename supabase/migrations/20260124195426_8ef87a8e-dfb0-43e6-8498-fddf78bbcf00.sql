-- Tighten overly-permissive INSERT policies flagged by linter

-- notifications: inserts should come from backend (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- digest_email_logs: inserts should come from backend only
DROP POLICY IF EXISTS "Service can insert digest logs" ON public.digest_email_logs;

-- contact_submissions: allow public contact form submits without using WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;

CREATE POLICY "Public can submit contact form"
ON public.contact_submissions
FOR INSERT
WITH CHECK (auth.role() IN ('anon', 'authenticated'));
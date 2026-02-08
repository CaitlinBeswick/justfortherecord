-- Add archived column to contact_submissions
ALTER TABLE public.contact_submissions 
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Update RLS policies to allow admins to delete submissions
CREATE POLICY "Admins can delete contact submissions" 
ON public.contact_submissions 
FOR DELETE 
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
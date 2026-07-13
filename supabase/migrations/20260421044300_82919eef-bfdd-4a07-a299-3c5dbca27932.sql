-- Department column on complaints
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS department public.complaint_category;

-- Department field on user_roles (links a department user to one dept)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS department public.complaint_category;

-- Helper function: get the department for a department-role user
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS public.complaint_category
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department
  FROM public.user_roles
  WHERE user_id = _user_id AND role = 'department'
  LIMIT 1
$$;

-- RLS: department users can view complaints routed to their dept
DROP POLICY IF EXISTS "Department views assigned complaints" ON public.complaints;
CREATE POLICY "Department views assigned complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'department')
  AND department IS NOT NULL
  AND department = public.get_user_department(auth.uid())
);

-- RLS: department users can update complaints routed to their dept
DROP POLICY IF EXISTS "Department updates assigned complaints" ON public.complaints;
CREATE POLICY "Department updates assigned complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'department')
  AND department = public.get_user_department(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'department')
  AND department = public.get_user_department(auth.uid())
);

-- Threaded updates table
CREATE TABLE IF NOT EXISTS public.complaint_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role public.app_role NOT NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint
  ON public.complaint_updates(complaint_id, created_at);

ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Updates visible to participants"
ON public.complaint_updates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_updates.complaint_id
      AND (
        c.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'department')
          AND c.department = public.get_user_department(auth.uid())
        )
      )
  )
);

CREATE POLICY "Participants post updates"
ON public.complaint_updates
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_updates.complaint_id
      AND (
        c.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'department')
          AND c.department = public.get_user_department(auth.uid())
        )
      )
  )
);
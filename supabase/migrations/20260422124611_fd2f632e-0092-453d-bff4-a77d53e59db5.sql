-- 1. Wipe existing department role assignments (start fresh per user request)
DELETE FROM public.user_roles WHERE role = 'department';

-- 2. Create departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.complaint_category NOT NULL,
  name text NOT NULL,
  description text,
  login_username text NOT NULL UNIQUE,
  user_id uuid NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_departments_category ON public.departments(category);
CREATE INDEX idx_departments_user_id ON public.departments(user_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins manage departments"
  ON public.departments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Department users can view their own row (so dashboard can show their info)
CREATE POLICY "Department views own row"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER departments_set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department';
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'assigned' BEFORE 'in_progress';
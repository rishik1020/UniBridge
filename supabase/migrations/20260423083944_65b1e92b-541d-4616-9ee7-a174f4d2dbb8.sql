-- Notification type enum
CREATE TYPE public.notification_type AS ENUM ('assignment', 'update', 'completion', 'verification');

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No INSERT policy: only triggers (security definer) create notifications.

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Helper: get all admin user_ids
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin';
$$;

-- Helper: get department user_id for a category
CREATE OR REPLACE FUNCTION public.get_department_user_id(_category complaint_category)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.user_roles
  WHERE role = 'department' AND department = _category
  LIMIT 1;
$$;

-- Trigger function: notify on assignment / status changes
CREATE OR REPLACE FUNCTION public.notify_on_complaint_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dept_user uuid;
  admin_id uuid;
  short_title text;
BEGIN
  short_title := COALESCE(NULLIF(NEW.title, ''), 'Complaint');

  -- Fired when complaint is newly routed to a department (assignment)
  IF (TG_OP = 'UPDATE' AND NEW.department IS NOT NULL
      AND (OLD.department IS DISTINCT FROM NEW.department)) THEN

    -- notify student
    INSERT INTO public.notifications (user_id, complaint_id, type, message)
    VALUES (NEW.created_by, NEW.id, 'assignment',
      'Your complaint "' || short_title || '" was routed to the ' || NEW.department::text || ' department.');

    -- notify department user (if one exists)
    dept_user := public.get_department_user_id(NEW.department);
    IF dept_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, complaint_id, type, message)
      VALUES (dept_user, NEW.id, 'assignment',
        'New task assigned: "' || short_title || '"');
    END IF;
  END IF;

  -- Status transitions
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status = 'in_progress' THEN
      INSERT INTO public.notifications (user_id, complaint_id, type, message)
      VALUES (NEW.created_by, NEW.id, 'update',
        'Work has started on your complaint "' || short_title || '".');

      FOR admin_id IN SELECT public.get_admin_user_ids() LOOP
        INSERT INTO public.notifications (user_id, complaint_id, type, message)
        VALUES (admin_id, NEW.id, 'update',
          'Department started work on "' || short_title || '".');
      END LOOP;
    ELSIF NEW.status = 'resolved' THEN
      INSERT INTO public.notifications (user_id, complaint_id, type, message)
      VALUES (NEW.created_by, NEW.id, 'completion',
        'Your complaint "' || short_title || '" has been marked resolved.');

      FOR admin_id IN SELECT public.get_admin_user_ids() LOOP
        INSERT INTO public.notifications (user_id, complaint_id, type, message)
        VALUES (admin_id, NEW.id, 'verification',
          'Complaint "' || short_title || '" was completed — please verify.');
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_complaint_change
AFTER UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.notify_on_complaint_change();
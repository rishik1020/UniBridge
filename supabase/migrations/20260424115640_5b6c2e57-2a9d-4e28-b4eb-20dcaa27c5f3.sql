-- 1. Create priority enum
CREATE TYPE public.complaint_priority AS ENUM ('P1', 'P2', 'P3', 'P4');

-- 2. Add priority column to complaints (default P3 = Medium)
ALTER TABLE public.complaints
ADD COLUMN priority public.complaint_priority NOT NULL DEFAULT 'P3';

-- 3. Index for sorting/filtering by priority
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);

-- 4. Update notify_on_complaint_change to include priority label
CREATE OR REPLACE FUNCTION public.notify_on_complaint_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  dept_user uuid;
  admin_id uuid;
  short_title text;
  prio_label text;
BEGIN
  short_title := COALESCE(NULLIF(NEW.title, ''), 'Complaint');
  prio_label := CASE NEW.priority
    WHEN 'P1' THEN 'P1 Critical'
    WHEN 'P2' THEN 'P2 High'
    WHEN 'P3' THEN 'P3 Medium'
    WHEN 'P4' THEN 'P4 Low'
    ELSE 'P3 Medium'
  END;

  IF (TG_OP = 'UPDATE' AND NEW.department IS NOT NULL
      AND (OLD.department IS DISTINCT FROM NEW.department)) THEN

    INSERT INTO public.notifications (user_id, complaint_id, type, message)
    VALUES (NEW.created_by, NEW.id, 'assignment',
      '[' || prio_label || '] Your complaint "' || short_title || '" was routed to the ' || NEW.department::text || ' department.');

    dept_user := public.get_department_user_id(NEW.department);
    IF dept_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, complaint_id, type, message)
      VALUES (dept_user, NEW.id, 'assignment',
        '[' || prio_label || '] New task assigned: "' || short_title || '"');
    END IF;
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status = 'in_progress' THEN
      INSERT INTO public.notifications (user_id, complaint_id, type, message)
      VALUES (NEW.created_by, NEW.id, 'update',
        '[' || prio_label || '] Work has started on your complaint "' || short_title || '".');

      FOR admin_id IN SELECT public.get_admin_user_ids() LOOP
        INSERT INTO public.notifications (user_id, complaint_id, type, message)
        VALUES (admin_id, NEW.id, 'update',
          '[' || prio_label || '] Department started work on "' || short_title || '".');
      END LOOP;
    ELSIF NEW.status = 'resolved' THEN
      INSERT INTO public.notifications (user_id, complaint_id, type, message)
      VALUES (NEW.created_by, NEW.id, 'completion',
        '[' || prio_label || '] Your complaint "' || short_title || '" has been marked resolved.');

      FOR admin_id IN SELECT public.get_admin_user_ids() LOOP
        INSERT INTO public.notifications (user_id, complaint_id, type, message)
        VALUES (admin_id, NEW.id, 'verification',
          '[' || prio_label || '] Complaint "' || short_title || '" was completed — please verify.');
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
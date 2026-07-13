-- Add rating fields to complaints
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS is_rated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rated_at timestamptz;

-- Allow students to rate ONLY their own resolved, not-yet-rated complaints
CREATE POLICY "Students rate own resolved complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  AND status = 'resolved'
  AND is_rated = false
)
WITH CHECK (
  auth.uid() = created_by
  AND status = 'resolved'
  AND is_rated = true
);

-- Trigger function: notify student to rate when complaint becomes resolved
CREATE OR REPLACE FUNCTION public.notify_rating_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE'
      AND NEW.status = 'resolved'
      AND OLD.status IS DISTINCT FROM 'resolved'
      AND NEW.is_rated = false) THEN
    INSERT INTO public.notifications (user_id, complaint_id, type, message)
    VALUES (
      NEW.created_by,
      NEW.id,
      'completion',
      'Your complaint "' || COALESCE(NULLIF(NEW.title, ''), 'Complaint') || '" has been resolved. Please rate your experience.'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_rating_request ON public.complaints;
CREATE TRIGGER trg_notify_rating_request
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_rating_request();

-- Ensure the existing change-notification trigger is attached (it's defined but not bound in current schema)
DROP TRIGGER IF EXISTS trg_notify_on_complaint_change ON public.complaints;
CREATE TRIGGER trg_notify_on_complaint_change
AFTER UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_complaint_change();
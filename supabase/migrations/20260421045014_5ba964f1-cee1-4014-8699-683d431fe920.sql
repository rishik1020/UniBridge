-- Add college column with a default so existing rows get backfilled
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS college text NOT NULL DEFAULT 'Woxsen University';

-- Update the signup trigger to capture the college from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.profiles (id, name, email, college)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'college', 'Woxsen University')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end;
$function$;
-- Fix function search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tighten storage select policy: only allow listing your own folder; public bucket still serves files by URL
drop policy if exists "Public read complaint images" on storage.objects;

create policy "Owners list own complaint images" on storage.objects
  for select to authenticated
  using (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Admins list complaint images" on storage.objects
  for select to authenticated
  using (bucket_id = 'complaint-images' and public.has_role(auth.uid(), 'admin'));
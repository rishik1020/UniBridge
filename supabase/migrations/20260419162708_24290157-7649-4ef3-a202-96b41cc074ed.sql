-- Roles enum and table
create type public.app_role as enum ('admin', 'student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Complaints
create type public.complaint_status as enum ('pending', 'in_progress', 'resolved');
create type public.complaint_category as enum ('hostel', 'academics', 'transport', 'infrastructure');

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category complaint_category not null,
  image_url text,
  status complaint_status not null default 'pending',
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index complaints_created_by_idx on public.complaints(created_by);
create index complaints_status_idx on public.complaints(status);

-- Security definer role check
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + default student role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger complaints_set_updated_at
before update on public.complaints
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.complaints enable row level security;

-- Profiles policies
create policy "Users view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Admins view all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- user_roles policies
create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Complaints policies
create policy "Students create own complaints" on public.complaints
  for insert to authenticated
  with check (auth.uid() = created_by);
create policy "Users view own complaints" on public.complaints
  for select to authenticated using (auth.uid() = created_by);
create policy "Admins view all complaints" on public.complaints
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update complaints" on public.complaints
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Students update own pending complaints" on public.complaints
  for update to authenticated
  using (auth.uid() = created_by and status = 'pending')
  with check (auth.uid() = created_by);

-- Storage bucket for complaint images
insert into storage.buckets (id, name, public) values ('complaint-images', 'complaint-images', true);

create policy "Public read complaint images" on storage.objects
  for select using (bucket_id = 'complaint-images');
create policy "Authenticated upload complaint images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own complaint images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);
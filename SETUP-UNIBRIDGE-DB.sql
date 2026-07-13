-- ============================================================================
--  UNIBRIDGE — full database setup for a fresh Supabase project
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query → paste → Run
--  Safe to re-run: it drops and recreates the app's objects (tables are empty).
-- ============================================================================

-- ---------- 0. Reset any existing partial schema ----------
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.complaint_votes   cascade;
drop table if exists public.complaint_updates cascade;
drop table if exists public.notifications     cascade;
drop table if exists public.complaints        cascade;
drop table if exists public.departments       cascade;
drop table if exists public.user_roles        cascade;
drop table if exists public.profiles          cascade;

drop type if exists public.app_role            cascade;
drop type if exists public.complaint_status    cascade;
drop type if exists public.complaint_category  cascade;
drop type if exists public.notification_type   cascade;
drop type if exists public.complaint_priority  cascade;

drop function if exists public.handle_new_user()            cascade;
drop function if exists public.set_updated_at()             cascade;
drop function if exists public.get_admin_user_ids()         cascade;
drop function if exists public.notify_on_complaint_change() cascade;
drop function if exists public.notify_rating_request()      cascade;
drop function if exists public.assign_ticket_number()       cascade;
drop function if exists public.sync_complaint_upvotes()     cascade;

-- ---------- 1. Enums (final values) ----------
create type public.app_role           as enum ('admin', 'student', 'department');
create type public.complaint_status   as enum ('pending', 'assigned', 'in_progress', 'resolved');
create type public.complaint_category as enum ('hostel', 'academics', 'transport', 'infrastructure');
create type public.notification_type  as enum ('assignment', 'update', 'completion', 'verification');
create type public.complaint_priority as enum ('P1', 'P2', 'P3', 'P4');

-- ---------- 2. Tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  college text not null default 'Woxsen University',
  room_number text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  department public.complaint_category,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create sequence if not exists public.complaint_ticket_seq;

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  ticket_number text,
  parent_id uuid references public.complaints(id) on delete set null,
  title text not null,
  description text not null,
  category public.complaint_category not null,
  department public.complaint_category,
  image_url text,
  status public.complaint_status not null default 'pending',
  priority public.complaint_priority not null default 'P3',
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  admin_notes text,
  room_number text,
  rating smallint check (rating between 1 and 5),
  feedback text,
  is_rated boolean not null default false,
  rated_at timestamptz,
  is_public boolean not null default true,
  is_anonymous boolean not null default false,
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index complaints_created_by_idx on public.complaints(created_by);
create index complaints_status_idx     on public.complaints(status);
create index idx_complaints_priority   on public.complaints(priority);
create index idx_complaints_parent     on public.complaints(parent_id);

-- Ticket numbering: roots -> 001, 002 ...  follow-ups -> 001-a, 001-b ...
create or replace function public.assign_ticket_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; n int;
begin
  if new.ticket_number is not null then return new; end if;
  if new.parent_id is null then
    new.ticket_number := lpad(nextval('public.complaint_ticket_seq')::text, 3, '0');
  else
    select split_part(ticket_number, '-', 1) into base from public.complaints where id = new.parent_id;
    if base is null or base = '' then base := '000'; end if;
    select count(*) into n from public.complaints where parent_id = new.parent_id;
    new.ticket_number := base || '-' || chr(97 + least(n, 25));
  end if;
  return new;
end $$;

create trigger trg_assign_ticket_number
  before insert on public.complaints
  for each row execute function public.assign_ticket_number();

create table public.complaint_updates (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  author_id uuid not null,
  author_role public.app_role not null,
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index idx_complaint_updates_complaint on public.complaint_updates(complaint_id, created_at);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  category public.complaint_category not null,
  name text not null,
  description text,
  login_email text not null unique,
  user_id uuid not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_departments_category on public.departments(category);
create index idx_departments_user_id  on public.departments(user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  complaint_id uuid references public.complaints(id) on delete cascade,
  type public.notification_type not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on public.notifications (user_id, is_read, created_at desc);

create table public.complaint_votes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (complaint_id, user_id)
);
create index idx_complaint_votes_complaint on public.complaint_votes(complaint_id);

create or replace function public.sync_complaint_upvotes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.complaints set upvotes = upvotes + 1 where id = new.complaint_id;
  elsif tg_op = 'DELETE' then
    update public.complaints set upvotes = greatest(upvotes - 1, 0) where id = old.complaint_id;
  end if;
  return null;
end $$;
create trigger trg_sync_upvotes
  after insert or delete on public.complaint_votes
  for each row execute function public.sync_complaint_upvotes();

-- ---------- 3. Functions ----------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_user_department(_user_id uuid)
returns public.complaint_category language sql stable security definer set search_path = public as $$
  select department from public.user_roles where user_id = _user_id and role = 'department' limit 1
$$;

create or replace function public.get_admin_user_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select user_id from public.user_roles where role = 'admin'
$$;

create or replace function public.get_department_user_id(_category public.complaint_category)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.user_roles where role = 'department' and department = _category limit 1
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Auto-create profile + default student role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, college)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'college', 'Woxsen University')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end;
$$;

-- Notifications on assignment / status changes (with priority label)
create or replace function public.notify_on_complaint_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  dept_user uuid; admin_id uuid; short_title text; prio_label text;
begin
  short_title := coalesce(nullif(new.title, ''), 'Complaint');
  prio_label := case new.priority
    when 'P1' then 'P1 Critical' when 'P2' then 'P2 High'
    when 'P3' then 'P3 Medium'   when 'P4' then 'P4 Low' else 'P3 Medium' end;

  if (tg_op = 'UPDATE' and new.department is not null
      and (old.department is distinct from new.department)) then
    insert into public.notifications (user_id, complaint_id, type, message)
    values (new.created_by, new.id, 'assignment',
      '[' || prio_label || '] Your complaint "' || short_title || '" was routed to the ' || new.department::text || ' department.');
    dept_user := public.get_department_user_id(new.department);
    if dept_user is not null then
      insert into public.notifications (user_id, complaint_id, type, message)
      values (dept_user, new.id, 'assignment', '[' || prio_label || '] New task assigned: "' || short_title || '"');
    end if;
  end if;

  if (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    if new.status = 'in_progress' then
      insert into public.notifications (user_id, complaint_id, type, message)
      values (new.created_by, new.id, 'update', '[' || prio_label || '] Work has started on your complaint "' || short_title || '".');
      for admin_id in select public.get_admin_user_ids() loop
        insert into public.notifications (user_id, complaint_id, type, message)
        values (admin_id, new.id, 'update', '[' || prio_label || '] Department started work on "' || short_title || '".');
      end loop;
    elsif new.status = 'resolved' then
      insert into public.notifications (user_id, complaint_id, type, message)
      values (new.created_by, new.id, 'completion', '[' || prio_label || '] Your complaint "' || short_title || '" has been marked resolved.');
      for admin_id in select public.get_admin_user_ids() loop
        insert into public.notifications (user_id, complaint_id, type, message)
        values (admin_id, new.id, 'verification', '[' || prio_label || '] Complaint "' || short_title || '" was completed — please verify.');
      end loop;
    end if;
  end if;
  return new;
end;
$$;

-- Notify student to rate when their complaint is resolved
create or replace function public.notify_rating_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE' and new.status = 'resolved'
      and old.status is distinct from 'resolved' and new.is_rated = false) then
    insert into public.notifications (user_id, complaint_id, type, message)
    values (new.created_by, new.id, 'completion',
      'Your complaint "' || coalesce(nullif(new.title, ''), 'Complaint') || '" has been resolved. Please rate your experience.');
  end if;
  return new;
end;
$$;

-- ---------- 4. Triggers ----------
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger complaints_set_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

create trigger trg_notify_on_complaint_change
  after update on public.complaints
  for each row execute function public.notify_on_complaint_change();

create trigger trg_notify_rating_request
  after update on public.complaints
  for each row execute function public.notify_rating_request();

-- ---------- 5. Row Level Security ----------
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.complaints        enable row level security;
alter table public.complaint_updates enable row level security;
alter table public.departments       enable row level security;
alter table public.notifications     enable row level security;
alter table public.complaint_votes   enable row level security;

-- profiles
create policy "Users view own profile"  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Admins view all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- user_roles
create policy "Users view own roles"  on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles"   on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- complaints
create policy "Students create own complaints" on public.complaints for insert to authenticated with check (auth.uid() = created_by);
create policy "Users view own complaints"      on public.complaints for select to authenticated using (auth.uid() = created_by);
create policy "Anyone views public complaints" on public.complaints for select to authenticated using (is_public = true);
create policy "Admins view all complaints"     on public.complaints for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update complaints"       on public.complaints for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Students update own pending complaints" on public.complaints for update to authenticated
  using (auth.uid() = created_by and status = 'pending') with check (auth.uid() = created_by);
create policy "Students rate own resolved complaints" on public.complaints for update to authenticated
  using (auth.uid() = created_by and status = 'resolved' and is_rated = false)
  with check (auth.uid() = created_by and status = 'resolved' and is_rated = true);
create policy "Department views assigned complaints" on public.complaints for select to authenticated
  using (public.has_role(auth.uid(), 'department') and department is not null and department = public.get_user_department(auth.uid()));
create policy "Department updates assigned complaints" on public.complaints for update to authenticated
  using (public.has_role(auth.uid(), 'department') and department = public.get_user_department(auth.uid()))
  with check (public.has_role(auth.uid(), 'department') and department = public.get_user_department(auth.uid()));

-- complaint_updates
create policy "Updates visible to participants" on public.complaint_updates for select to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_updates.complaint_id
    and (c.created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
      or (public.has_role(auth.uid(), 'department') and c.department = public.get_user_department(auth.uid())))));
create policy "Participants post updates" on public.complaint_updates for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.complaints c where c.id = complaint_updates.complaint_id
    and (c.created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
      or (public.has_role(auth.uid(), 'department') and c.department = public.get_user_department(auth.uid())))));

-- departments
create policy "Admins manage departments" on public.departments for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Department views own row"  on public.departments for select to authenticated using (user_id = auth.uid());

-- notifications  (no INSERT policy: only security-definer triggers create them)
create policy "Users view own notifications"      on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Users mark own notifications read"  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- complaint_votes (one vote per user; upvotes counter maintained by trigger)
create policy "Users view own votes"   on public.complaint_votes for select to authenticated using (user_id = auth.uid());
create policy "Users add own votes"    on public.complaint_votes for insert to authenticated with check (user_id = auth.uid());
create policy "Users remove own votes" on public.complaint_votes for delete to authenticated using (user_id = auth.uid());

-- ---------- 6. Realtime for notifications ----------
alter table public.notifications replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- ---------- 7. Storage bucket for complaint images ----------
insert into storage.buckets (id, name, public)
values ('complaint-images', 'complaint-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Owners list own complaint images"       on storage.objects;
drop policy if exists "Admins list complaint images"           on storage.objects;
drop policy if exists "Authenticated upload complaint images"  on storage.objects;
drop policy if exists "Users delete own complaint images"      on storage.objects;

create policy "Owners list own complaint images" on storage.objects for select to authenticated
  using (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Admins list complaint images" on storage.objects for select to authenticated
  using (bucket_id = 'complaint-images' and public.has_role(auth.uid(), 'admin'));
create policy "Authenticated upload complaint images" on storage.objects for insert to authenticated
  with check (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own complaint images" on storage.objects for delete to authenticated
  using (bucket_id = 'complaint-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
--  DONE. Every new signup becomes a 'student' automatically.
--
--  To make yourself an ADMIN: sign up/log in once in the app, then run this
--  (replace the email) in a new SQL Editor query:
--
--    update public.user_roles
--    set role = 'admin', department = null
--    where user_id = (select id from auth.users where email = 'you@example.com');
--
--  Note: creating DEPARTMENT login accounts from the Admin panel needs the
--  'manage-department' Edge Function deployed — that's a separate step.
-- ============================================================================

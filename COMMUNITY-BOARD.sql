-- ============================================================================
--  Community board: public complaints + upvotes ("me too") + anonymous reports
--  Run ONCE in: Unibridge → SQL Editor → New query → paste → Run. Safe to re-run.
-- ============================================================================

-- 1. Flags + upvote counter on complaints
alter table public.complaints add column if not exists is_public     boolean not null default true;
alter table public.complaints add column if not exists is_anonymous  boolean not null default false;
alter table public.complaints add column if not exists upvotes       integer not null default 0;

-- 2. One-vote-per-user table
create table if not exists public.complaint_votes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (complaint_id, user_id)
);
create index if not exists idx_complaint_votes_complaint on public.complaint_votes(complaint_id);

alter table public.complaint_votes enable row level security;
drop policy if exists "Users view own votes"   on public.complaint_votes;
drop policy if exists "Users add own votes"     on public.complaint_votes;
drop policy if exists "Users remove own votes"  on public.complaint_votes;
create policy "Users view own votes"  on public.complaint_votes for select to authenticated using (user_id = auth.uid());
create policy "Users add own votes"   on public.complaint_votes for insert to authenticated with check (user_id = auth.uid());
create policy "Users remove own votes" on public.complaint_votes for delete to authenticated using (user_id = auth.uid());

-- 3. Keep complaints.upvotes in sync with the votes table
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
drop trigger if exists trg_sync_upvotes on public.complaint_votes;
create trigger trg_sync_upvotes
  after insert or delete on public.complaint_votes
  for each row execute function public.sync_complaint_upvotes();

-- 4. Let every authenticated user SEE public complaints (the community board).
--    (Private complaints stay visible only to owner / admin / assigned dept.)
drop policy if exists "Anyone views public complaints" on public.complaints;
create policy "Anyone views public complaints" on public.complaints
  for select to authenticated using (is_public = true);

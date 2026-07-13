-- ============================================================================
--  Push complaint status changes LIVE to every open dashboard
--  (admin, student, and department) with no page refresh.
--  Run ONCE in: Unibridge → SQL Editor → New query → paste → Run.
--  Without this the panels still refresh when you switch back to the tab;
--  with it, updates appear instantly.
-- ============================================================================
alter table public.complaints replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.complaints;
exception
  when duplicate_object then null;  -- already added, ignore
end $$;

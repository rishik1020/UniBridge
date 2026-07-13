-- ============================================================================
--  Ticket numbers + follow-up chains
--  Roots get 001, 002, 003 ...   Follow-ups of #001 get 001-a, 001-b ...
--  Run ONCE in: Unibridge → SQL Editor → New query → paste → Run. Safe to re-run.
-- ============================================================================

alter table public.complaints add column if not exists ticket_number text;
alter table public.complaints add column if not exists parent_id uuid
  references public.complaints(id) on delete set null;
create index if not exists idx_complaints_parent on public.complaints(parent_id);

create sequence if not exists public.complaint_ticket_seq;

-- Assign a ticket number on insert:
--   • root complaint (no parent)  -> next sequence value, zero-padded  (e.g. 007)
--   • follow-up (has parent)      -> parent's base + next letter       (e.g. 007-a)
create or replace function public.assign_ticket_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare base text; n int;
begin
  if new.ticket_number is not null then
    return new;  -- explicit value (used by the backfill below) wins
  end if;

  if new.parent_id is null then
    new.ticket_number := lpad(nextval('public.complaint_ticket_seq')::text, 3, '0');
  else
    select split_part(ticket_number, '-', 1) into base
      from public.complaints where id = new.parent_id;
    if base is null or base = '' then base := '000'; end if;
    select count(*) into n from public.complaints where parent_id = new.parent_id;
    new.ticket_number := base || '-' || chr(97 + least(n, 25));  -- a, b, c ...
  end if;
  return new;
end $$;

drop trigger if exists trg_assign_ticket_number on public.complaints;
create trigger trg_assign_ticket_number
  before insert on public.complaints
  for each row execute function public.assign_ticket_number();

-- Backfill existing root complaints in creation order (001, 002, ...)
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.complaints
  where parent_id is null and ticket_number is null
)
update public.complaints c
set ticket_number = lpad(o.rn::text, 3, '0')
from ordered o
where c.id = o.id;

-- Advance the sequence past the numbers we just backfilled
select setval(
  'public.complaint_ticket_seq',
  greatest((select count(*) from public.complaints where parent_id is null), 1),
  (select count(*) from public.complaints where parent_id is null) > 0
);

-- ============================================================================
--  UNIBRIDGE — grant roles to the pre-created accounts
--  Run ONCE in: Unibridge → SQL Editor → New query → paste → Run
--  (The auth accounts already exist; this just gives them the right roles.)
--  Safe to re-run.
-- ============================================================================

-- 1. Make the admin account a real admin
update public.user_roles
set role = 'admin', department = null
where user_id = (select id from auth.users where email = 'admin@unibridge.app');

-- 2. Turn each department account into its department role
update public.user_roles ur
set role = 'department',
    department = d.cat::public.complaint_category
from (values
  ('hostel@unibridge.app',         'hostel'),
  ('academics@unibridge.app',      'academics'),
  ('transport@unibridge.app',      'transport'),
  ('infrastructure@unibridge.app', 'infrastructure')
) as d(email, cat)
where ur.user_id = (select id from auth.users u where u.email = d.email);

-- 3. List the departments in the Admin → Departments panel
delete from public.departments
where login_email in (
  'hostel@unibridge.app','academics@unibridge.app',
  'transport@unibridge.app','infrastructure@unibridge.app'
);

insert into public.departments (category, name, login_email, user_id, created_by)
select
  x.cat::public.complaint_category,
  x.name,
  x.email,
  (select id from auth.users where email = x.email),
  (select id from auth.users where email = 'admin@unibridge.app')
from (values
  ('hostel',         'Hostel Department',         'hostel@unibridge.app'),
  ('academics',      'Academics Department',      'academics@unibridge.app'),
  ('transport',      'Transport Department',      'transport@unibridge.app'),
  ('infrastructure', 'Infrastructure Department', 'infrastructure@unibridge.app')
) as x(cat, name, email);

-- 4. Show the result
select u.email, ur.role, ur.department
from public.user_roles ur
join auth.users u on u.id = ur.user_id
where u.email like '%@unibridge.app'
order by ur.role, u.email;

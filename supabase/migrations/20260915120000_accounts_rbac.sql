-- حسابات الموظفين والصلاحيات. شغّله مرة من SQL Editor ثم فعّل Auth → Email.
-- عطّل "Confirm email" في Authentication → Providers → Email ليسهل الدخول الداخلي.

alter table public.employees
  add column if not exists user_id uuid unique,
  add column if not exists app_role text not null default 'member',
  add column if not exists org_unit text not null default '';

alter table public.employees drop constraint if exists employees_app_role_check;
alter table public.employees
  add constraint employees_app_role_check
  check (app_role in ('manager', 'deputy', 'supervisor', 'member'));

alter table public.tasks
  add column if not exists assignee_id uuid references public.employees(id) on delete set null;

update public.employees
set app_role = 'manager'
where job_title ilike '%مسئول الاسرة%'
  and job_title not ilike '%نائب%'
  and app_role = 'member';

update public.employees
set app_role = 'deputy'
where job_title ilike '%نائب مسئول%'
  and app_role = 'member';

update public.employees e
set org_unit = e.department
where coalesce(trim(e.org_unit), '') = '' and coalesce(trim(e.department), '') <> '';

update public.tasks t
set assignee_id = e.id
from public.employees e
where t.assignee_id is null
  and trim(coalesce(t.assignee, '')) <> ''
  and trim(e.full_name) = trim(t.assignee);

create or replace function public.my_employee()
returns public.employees
language sql
stable
security definer
set search_path = public
as $$
  select * from public.employees where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_leadership()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where user_id = auth.uid()
      and app_role in ('manager', 'deputy')
  );
$$;

create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where user_id = auth.uid()
      and app_role = 'supervisor'
  );
$$;

create or replace function public.my_unit()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(trim(org_unit), trim(department), '')
  from public.employees
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.employee_in_my_unit(emp_id uuid, emp_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_supervisor()
    and public.my_unit() <> ''
    and exists (
      select 1 from public.employees e
      where (
        (emp_id is not null and e.id = emp_id)
        or (emp_id is null and emp_name is not null and trim(e.full_name) = trim(emp_name))
      )
      and coalesce(trim(e.org_unit), trim(e.department), '') = public.my_unit()
    );
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where user_id = auth.uid()
      and app_role = 'manager'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employees
  set user_id = new.id
  where user_id is null
    and trim(email) <> ''
    and lower(trim(email)) = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- إغلاق السياسات المفتوحة
drop policy if exists "employees_open" on public.employees;
drop policy if exists "tasks_open" on public.tasks;
drop policy if exists "branches_open" on public.branches;
drop policy if exists "org_nodes_open" on public.org_nodes;
drop policy if exists "weekly_schedule_open" on public.weekly_schedule;
drop policy if exists "weekly_schedule open access" on public.weekly_schedule;
drop policy if exists "notifications_open" on public.notifications;
drop policy if exists "notifications open access" on public.notifications;
drop policy if exists "reports_open" on public.reports;
drop policy if exists "push_subscriptions_open" on public.push_subscriptions;

drop policy if exists employees_select on public.employees;
drop policy if exists employees_write_lead on public.employees;
drop policy if exists employees_insert_lead on public.employees;
drop policy if exists employees_delete_lead on public.employees;
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;
drop policy if exists org_select on public.org_nodes;
drop policy if exists org_write on public.org_nodes;
drop policy if exists schedule_select on public.weekly_schedule;
drop policy if exists schedule_write on public.weekly_schedule;
drop policy if exists branches_lead on public.branches;
drop policy if exists reports_select on public.reports;
drop policy if exists reports_insert on public.reports;
drop policy if exists reports_update on public.reports;
drop policy if exists reports_delete on public.reports;
drop policy if exists notif_auth on public.notifications;
drop policy if exists push_auth on public.push_subscriptions;

create policy employees_select on public.employees
  for select to authenticated
  using (
    public.is_leadership()
    or user_id = auth.uid()
    or app_role in ('manager', 'deputy', 'supervisor')
    or (
      coalesce(trim(org_unit), trim(department), '') <> ''
      and coalesce(trim(org_unit), trim(department), '') = (
        select coalesce(trim(org_unit), trim(department), '')
        from public.employees
        where user_id = auth.uid()
        limit 1
      )
    )
  );

create policy employees_insert_lead on public.employees
  for insert to authenticated
  with check (public.is_leadership());

create policy employees_write_lead on public.employees
  for update to authenticated
  using (public.is_leadership())
  with check (public.is_leadership());

create policy employees_delete_lead on public.employees
  for delete to authenticated
  using (public.is_leadership());

create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_leadership()
    or public.employee_in_my_unit(assignee_id, assignee)
    or assignee_id = (select id from public.employees where user_id = auth.uid() limit 1)
    or (
      assignee_id is null
      and trim(assignee) <> ''
      and trim(assignee) = (select trim(full_name) from public.employees where user_id = auth.uid() limit 1)
    )
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    public.is_leadership()
    or public.employee_in_my_unit(assignee_id, assignee)
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    public.is_leadership()
    or public.employee_in_my_unit(assignee_id, assignee)
    or assignee_id = (select id from public.employees where user_id = auth.uid() limit 1)
  )
  with check (
    public.is_leadership()
    or public.employee_in_my_unit(assignee_id, assignee)
    or assignee_id = (select id from public.employees where user_id = auth.uid() limit 1)
  );

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (
    public.is_leadership()
    or public.employee_in_my_unit(assignee_id, assignee)
  );

create policy org_select on public.org_nodes
  for select to authenticated using (true);
create policy org_write on public.org_nodes
  for all to authenticated
  using (public.is_leadership())
  with check (public.is_leadership());

create policy schedule_select on public.weekly_schedule
  for select to authenticated using (true);
create policy schedule_write on public.weekly_schedule
  for all to authenticated
  using (public.is_leadership())
  with check (public.is_leadership());

create policy branches_lead on public.branches
  for all to authenticated
  using (public.is_leadership())
  with check (public.is_leadership());

create policy reports_select on public.reports
  for select to authenticated
  using (
    public.is_leadership()
    or employee_id = (select id from public.employees where user_id = auth.uid() limit 1)
  );
create policy reports_insert on public.reports
  for insert to authenticated
  with check (
    public.is_leadership()
    or employee_id = (select id from public.employees where user_id = auth.uid() limit 1)
  );
create policy reports_update on public.reports
  for update to authenticated
  using (
    public.is_leadership()
    or employee_id = (select id from public.employees where user_id = auth.uid() limit 1)
  )
  with check (
    public.is_leadership()
    or employee_id = (select id from public.employees where user_id = auth.uid() limit 1)
  );
create policy reports_delete on public.reports
  for delete to authenticated
  using (public.is_leadership());

create policy notif_auth on public.notifications
  for all to authenticated using (true) with check (true);

create policy push_auth on public.push_subscriptions
  for all to authenticated using (true) with check (true);

grant execute on function public.my_employee() to authenticated;
grant execute on function public.is_leadership() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_supervisor() to authenticated;
grant execute on function public.my_unit() to authenticated;
grant execute on function public.employee_in_my_unit(uuid, text) to authenticated;

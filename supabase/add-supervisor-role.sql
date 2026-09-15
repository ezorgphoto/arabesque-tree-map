-- إضافة دور مشرف قسم/لجنة إن كان enable-accounts.sql قد شُغّل سابقاً.

alter table public.employees drop constraint if exists employees_app_role_check;
alter table public.employees
  add constraint employees_app_role_check
  check (app_role in ('manager', 'deputy', 'supervisor', 'member'));

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

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select to authenticated
  using (
    public.is_leadership()
    or user_id = auth.uid()
    or app_role in ('manager', 'deputy', 'supervisor')
    or (
      coalesce(trim(org_unit), trim(department), '') <> ''
      and coalesce(trim(org_unit), trim(department), '') = public.my_unit()
    )
  );

drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

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

grant execute on function public.is_supervisor() to authenticated;
grant execute on function public.my_unit() to authenticated;
grant execute on function public.employee_in_my_unit(uuid, text) to authenticated;

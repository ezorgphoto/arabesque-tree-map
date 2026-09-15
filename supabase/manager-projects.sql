-- صلاحيات مطلقة للمسؤول + جداول إدارة المشاريع والتسلسل.
-- شغّله مرة من SQL Editor بعد enable-accounts.sql

notify pgrst, 'reload schema';

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

-- المسؤول يرى ويعدّل كل الجداول الأساسية
do $$
declare t text;
begin
  foreach t in array array['employees','tasks','branches','org_nodes','weekly_schedule','reports','notifications','push_subscriptions']
  loop
    execute format('drop policy if exists manager_all on public.%I', t);
    execute format(
      'create policy manager_all on public.%I for all to authenticated using (public.is_manager()) with check (public.is_manager())',
      t
    );
  end loop;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'planned',
  start_date date,
  end_date date,
  manager_id uuid references public.employees(id) on delete set null,
  org_unit text not null default '',
  parent_id uuid references public.projects(id) on delete cascade,
  predecessor_id uuid references public.projects(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null;

grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;

drop policy if exists projects_select on public.projects;
drop policy if exists projects_write on public.projects;
drop policy if exists manager_all on public.projects;

create policy manager_all on public.projects
  for all to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy projects_select on public.projects
  for select to authenticated
  using (
    public.is_leadership()
    or public.is_supervisor()
    or coalesce(trim(org_unit), '') = public.my_unit()
    or manager_id = (select id from public.employees where user_id = auth.uid() limit 1)
  );

create policy projects_write on public.projects
  for all to authenticated
  using (public.is_leadership() or public.is_supervisor())
  with check (public.is_leadership() or public.is_supervisor());

grant execute on function public.is_supervisor() to authenticated;
grant execute on function public.my_unit() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_leadership() to authenticated;

notify pgrst, 'reload schema';

-- =============================================================================
-- Arabesque Tree Map — Executive RBAC + RLS (production migration)
-- Roles: executive | secretary | team_member
-- Safe alongside existing kanban `tasks` / `employees` (uses executive_tasks)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1) Profiles (linked to auth.users) — security-definer helpers avoid RLS recursion
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.exec_role as enum ('executive', 'secretary', 'team_member');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.exec_role not null default 'team_member',
  full_name text not null default '',
  avatar_url text,
  department text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_department_idx on public.profiles (department);

alter table public.profiles enable row level security;

-- Role helpers: SECURITY DEFINER + empty search_path pattern prevents recursion
create or replace function public.current_profile_role()
returns public.exec_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_executive()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'executive' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_secretary()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'secretary' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'team_member' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_exec_or_secretary()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('executive', 'secretary') from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_executive() to authenticated;
grant execute on function public.is_secretary() to authenticated;
grant execute on function public.is_team_member() to authenticated;
grant execute on function public.is_exec_or_secretary() to authenticated;

-- Auto-create profile on signup
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), ''),
    coalesce((new.raw_user_meta_data->>'role')::public.exec_role, 'team_member'),
    coalesce(new.raw_user_meta_data->>'department', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Profiles RLS
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_executive_all on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_executive())
  with check (id = auth.uid() or public.is_executive());

create policy profiles_executive_all on public.profiles
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- -----------------------------------------------------------------------------
-- 2) Executive workflow tasks
--    (separate from existing kanban public.tasks used by /tasks)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.exec_task_status as enum ('pending', 'in_review', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.exec_task_priority as enum ('urgent', 'high', 'medium', 'low');
exception when duplicate_object then null;
end $$;

create table if not exists public.executive_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status public.exec_task_status not null default 'pending',
  priority public.exec_task_priority not null default 'medium',
  created_by uuid not null references auth.users (id) on delete restrict,
  assigned_to uuid references auth.users (id) on delete set null,
  delegated_by uuid references auth.users (id) on delete set null,
  due_date timestamptz,
  reject_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists executive_tasks_status_idx on public.executive_tasks (status);
create index if not exists executive_tasks_assigned_to_idx on public.executive_tasks (assigned_to);
create index if not exists executive_tasks_created_by_idx on public.executive_tasks (created_by);
create index if not exists executive_tasks_due_date_idx on public.executive_tasks (due_date);
create index if not exists executive_tasks_priority_idx on public.executive_tasks (priority);

drop trigger if exists executive_tasks_set_updated_at on public.executive_tasks;
create trigger executive_tasks_set_updated_at
  before update on public.executive_tasks
  for each row execute function public.set_updated_at();

alter table public.executive_tasks enable row level security;

drop policy if exists exec_tasks_executive_all on public.executive_tasks;
drop policy if exists exec_tasks_secretary_rw on public.executive_tasks;
drop policy if exists exec_tasks_secretary_select on public.executive_tasks;
drop policy if exists exec_tasks_secretary_insert on public.executive_tasks;
drop policy if exists exec_tasks_secretary_update on public.executive_tasks;
drop policy if exists exec_tasks_secretary_delete on public.executive_tasks;
drop policy if exists exec_tasks_member_select on public.executive_tasks;
drop policy if exists exec_tasks_member_insert on public.executive_tasks;
drop policy if exists exec_tasks_member_update on public.executive_tasks;

-- Executive: full CRUD
create policy exec_tasks_executive_all on public.executive_tasks
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- Secretary: read/create/update all tasks (no delete unless executive)
create policy exec_tasks_secretary_select on public.executive_tasks
  for select to authenticated
  using (public.is_secretary() or public.is_executive());

create policy exec_tasks_secretary_insert on public.executive_tasks
  for insert to authenticated
  with check (public.is_secretary() or public.is_executive());

create policy exec_tasks_secretary_update on public.executive_tasks
  for update to authenticated
  using (public.is_secretary() or public.is_executive())
  with check (public.is_secretary() or public.is_executive());

create policy exec_tasks_secretary_delete on public.executive_tasks
  for delete to authenticated
  using (public.is_executive());

-- Team member: only assigned_to or created_by
create policy exec_tasks_member_select on public.executive_tasks
  for select to authenticated
  using (
    public.is_team_member()
    and (assigned_to = auth.uid() or created_by = auth.uid())
  );

create policy exec_tasks_member_insert on public.executive_tasks
  for insert to authenticated
  with check (
    public.is_team_member()
    and created_by = auth.uid()
  );

create policy exec_tasks_member_update on public.executive_tasks
  for update to authenticated
  using (
    public.is_team_member()
    and (assigned_to = auth.uid() or created_by = auth.uid())
  )
  with check (
    public.is_team_member()
    and (assigned_to = auth.uid() or created_by = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 3) Executive decisions + confidentiality
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.confidentiality_level as enum ('public', 'internal', 'top_secret');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.decision_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists public.executive_decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  confidentiality_level public.confidentiality_level not null default 'internal',
  status public.decision_status not null default 'draft',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists executive_decisions_level_idx
  on public.executive_decisions (confidentiality_level);
create index if not exists executive_decisions_status_idx
  on public.executive_decisions (status);
create index if not exists executive_decisions_created_by_idx
  on public.executive_decisions (created_by);

drop trigger if exists executive_decisions_set_updated_at on public.executive_decisions;
create trigger executive_decisions_set_updated_at
  before update on public.executive_decisions
  for each row execute function public.set_updated_at();

alter table public.executive_decisions enable row level security;

drop policy if exists exec_decisions_executive_all on public.executive_decisions;
drop policy if exists exec_decisions_secretary_select on public.executive_decisions;
drop policy if exists exec_decisions_member_deny on public.executive_decisions;

create policy exec_decisions_executive_all on public.executive_decisions
  for all to authenticated
  using (public.is_executive())
  with check (public.is_executive());

-- Secretary: read only when NOT top_secret
create policy exec_decisions_secretary_select on public.executive_decisions
  for select to authenticated
  using (
    public.is_secretary()
    and confidentiality_level <> 'top_secret'
  );

-- Team members: no access (no policy = deny by default with RLS enabled)

-- -----------------------------------------------------------------------------
-- 4) Audit logs for executive_decisions UPDATE/DELETE
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_table_record_idx
  on public.audit_logs (table_name, record_id);
create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx
  on public.audit_logs (user_id);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_executive_select on public.audit_logs;
create policy audit_logs_executive_select on public.audit_logs
  for select to authenticated
  using (public.is_executive());

-- Inserts only via trigger (security definer)
create or replace function public.audit_executive_decisions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.audit_logs (table_name, record_id, user_id, action, old_data, new_data)
    values (
      'executive_decisions',
      old.id,
      auth.uid(),
      'UPDATE',
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (table_name, record_id, user_id, action, old_data, new_data)
    values (
      'executive_decisions',
      old.id,
      auth.uid(),
      'DELETE',
      to_jsonb(old),
      null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists audit_executive_decisions_trg on public.executive_decisions;
create trigger audit_executive_decisions_trg
  after update or delete on public.executive_decisions
  for each row execute function public.audit_executive_decisions();

-- -----------------------------------------------------------------------------
-- 5) Grants
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.executive_tasks to authenticated;
grant select, insert, update, delete on public.executive_decisions to authenticated;
grant select on public.audit_logs to authenticated;

grant all on public.profiles to service_role;
grant all on public.executive_tasks to service_role;
grant all on public.executive_decisions to service_role;
grant all on public.audit_logs to service_role;

-- -----------------------------------------------------------------------------
-- 6) Optional bridge: seed profile role from existing employees.app_role
--    manager→executive, deputy→secretary, supervisor/member→team_member
-- -----------------------------------------------------------------------------
insert into public.profiles (id, full_name, role, department)
select
  e.user_id,
  coalesce(e.full_name, ''),
  case e.app_role
    when 'manager' then 'executive'::public.exec_role
    when 'deputy' then 'secretary'::public.exec_role
    else 'team_member'::public.exec_role
  end,
  coalesce(nullif(trim(e.org_unit), ''), nullif(trim(e.department), ''), '')
from public.employees e
where e.user_id is not null
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  department = excluded.department,
  updated_at = now();

-- Enable realtime (run in dashboard if publication already exists)
-- alter publication supabase_realtime add table public.executive_tasks;
-- alter publication supabase_realtime add table public.executive_decisions;

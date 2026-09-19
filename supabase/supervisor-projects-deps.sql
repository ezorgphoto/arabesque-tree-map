-- حسابات الدخول للمسؤول / النائب / مشرف اللجنة فقط — العضو بلا حساب.
-- اعتمادات متعددة للمشاريع (غانت).

create or replace function public.can_activate_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees
    where trim(email) <> ''
      and lower(trim(email)) = lower(trim(p_email))
      and app_role in ('manager', 'deputy', 'supervisor')
  );
$$;

grant execute on function public.can_activate_account(text) to anon, authenticated;

create table if not exists public.project_deps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  depends_on_id uuid not null references public.projects(id) on delete cascade,
  dep_type text not null default 'FS'
    check (dep_type in ('FS', 'SS', 'FF', 'SF')),
  lag_days integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, depends_on_id, dep_type)
);

create index if not exists project_deps_project_idx on public.project_deps(project_id);
create index if not exists project_deps_depends_idx on public.project_deps(depends_on_id);

grant select, insert, update, delete on public.project_deps to authenticated;
grant all on public.project_deps to service_role;
alter table public.project_deps enable row level security;

drop policy if exists project_deps_select on public.project_deps;
drop policy if exists project_deps_write on public.project_deps;

create policy project_deps_select on public.project_deps
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          public.is_leadership()
          or public.is_supervisor()
          or p.created_by = (public.my_employee()).id
          or p.manager_id = (public.my_employee()).id
          or (
            public.my_unit() <> ''
            and coalesce(trim(p.org_unit), '') = public.my_unit()
          )
        )
    )
  );

create policy project_deps_write on public.project_deps
  for all to authenticated
  using (public.is_leadership() or public.is_supervisor())
  with check (public.is_leadership() or public.is_supervisor());

-- نسخ الاعتماد البسيط السابق إلى الجدول الجديد إن وُجد
insert into public.project_deps (project_id, depends_on_id, dep_type, lag_days)
select id, predecessor_id, 'FS', 0
from public.projects
where predecessor_id is not null
on conflict do nothing;

notify pgrst, 'reload schema';

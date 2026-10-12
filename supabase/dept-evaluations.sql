-- تقييمات الأقسام: مشاهدة للقيادة والمشرفين، كتابة لمحرر التقييم (رامي موسى / التحديث والتطوير) أو المسؤول
create table if not exists public.dept_evaluations (
  id uuid primary key default gen_random_uuid(),
  org_unit text not null default '',
  period_label text not null default '',
  completed_all_tasks boolean not null default false,
  timely_completion boolean not null default false,
  uploaded_report boolean not null default false,
  added_app_tasks boolean not null default false,
  notes text not null default '',
  evaluator_id uuid null references public.employees(id) on delete set null,
  evaluator_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dept_evaluations_org_unit_idx on public.dept_evaluations (org_unit);
create index if not exists dept_evaluations_created_at_idx on public.dept_evaluations (created_at desc);

alter table public.dept_evaluations enable row level security;

create or replace function public.is_eval_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.user_id = auth.uid()
      and (
        public.is_manager()
        or (
          e.full_name ilike '%رامي%موسى%'
          or (
            coalesce(e.org_unit, e.department, '') ilike '%التحديث والتطوير%'
            and e.full_name ilike '%رامي%'
          )
        )
      )
  );
$$;

drop policy if exists dept_evaluations_select on public.dept_evaluations;
drop policy if exists dept_evaluations_write on public.dept_evaluations;

create policy dept_evaluations_select on public.dept_evaluations
  for select to authenticated
  using (public.is_leadership() or public.is_supervisor());

create policy dept_evaluations_write on public.dept_evaluations
  for all to authenticated
  using (public.is_eval_editor())
  with check (public.is_eval_editor());

grant select, insert, update, delete on public.dept_evaluations to authenticated;
grant all on public.dept_evaluations to service_role;
grant execute on function public.is_eval_editor() to authenticated;

drop trigger if exists update_dept_evaluations_updated_at on public.dept_evaluations;
create trigger update_dept_evaluations_updated_at
  before update on public.dept_evaluations
  for each row execute function public.update_updated_at_column();

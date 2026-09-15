-- عمل مشترك: القسم يرى مشروعه، المسؤول يرى الكل، والمسند إليه يرى ما كُلّف به.
-- شغّله مرة من SQL Editor.

alter table public.projects
  add column if not exists created_by uuid references public.employees(id) on delete set null;

grant execute on function public.my_employee() to authenticated;
grant execute on function public.is_leadership() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_supervisor() to authenticated;
grant execute on function public.my_unit() to authenticated;

drop policy if exists manager_all on public.projects;
drop policy if exists projects_select on public.projects;
drop policy if exists projects_write on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;
drop policy if exists projects_delete on public.projects;

create policy projects_select on public.projects
  for select to authenticated
  using (
    public.is_leadership()
    or public.is_supervisor()
    or created_by = (public.my_employee()).id
    or manager_id = (public.my_employee()).id
    or (
      public.my_unit() <> ''
      and coalesce(trim(org_unit), '') = public.my_unit()
    )
  );

create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    created_by is null
    or created_by = (public.my_employee()).id
    or public.is_leadership()
  );

create policy projects_update on public.projects
  for update to authenticated
  using (
    public.is_leadership()
    or public.is_supervisor()
    or created_by = (public.my_employee()).id
    or manager_id = (public.my_employee()).id
  )
  with check (
    public.is_leadership()
    or public.is_supervisor()
    or created_by = (public.my_employee()).id
    or manager_id = (public.my_employee()).id
  );

create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_leadership() or created_by = (public.my_employee()).id);

notify pgrst, 'reload schema';

-- إصلاح قراءة البيانات بعد تفعيل الحسابات.
-- شغّله مرة من SQL Editor في مشروع budtqbmbicnlgfzwqtgq.

grant execute on function public.my_employee() to anon, authenticated;
grant execute on function public.is_leadership() to anon, authenticated;
grant execute on function public.is_manager() to anon, authenticated;
grant execute on function public.is_supervisor() to anon, authenticated;
grant execute on function public.my_unit() to anon, authenticated;
grant execute on function public.employee_in_my_unit(uuid, text) to anon, authenticated;

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select to authenticated
  using (
    public.is_leadership()
    or user_id = auth.uid()
    or app_role in ('manager', 'deputy', 'supervisor')
    or (
      public.my_unit() <> ''
      and coalesce(trim(org_unit), trim(department), '') = public.my_unit()
    )
  );

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_leadership()
    or public.employee_in_my_unit(assignee_id, assignee)
    or assignee_id = (public.my_employee()).id
    or (
      assignee_id is null
      and trim(coalesce(assignee, '')) <> ''
      and trim(assignee) = trim(coalesce((public.my_employee()).full_name, ''))
    )
  );

drop policy if exists branches_lead on public.branches;
drop policy if exists branches_select on public.branches;
drop policy if exists branches_write on public.branches;
create policy branches_select on public.branches
  for select to authenticated
  using (public.is_leadership());
create policy branches_write on public.branches
  for all to authenticated
  using (public.is_leadership())
  with check (public.is_leadership());

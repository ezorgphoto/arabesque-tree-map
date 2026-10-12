-- يسمح للمشرفين أيضاً بإضافة/تعديل/حذف مواعيد المخطط المشترك
drop policy if exists schedule_write on public.weekly_schedule;
create policy schedule_write on public.weekly_schedule
  for all to authenticated
  using (public.is_leadership() or public.is_supervisor())
  with check (public.is_leadership() or public.is_supervisor());

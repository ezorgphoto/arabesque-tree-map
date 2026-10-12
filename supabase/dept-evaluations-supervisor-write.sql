-- توسيع صلاحية كتابة التقييمات لتشمل المشرفين (للتدخل اليدوي عند الحاجة)
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
        public.is_leadership()
        or public.is_supervisor()
        or e.full_name ilike '%رامي%موسى%'
      )
  );
$$;

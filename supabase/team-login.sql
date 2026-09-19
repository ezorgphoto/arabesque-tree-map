-- حسابات الدخول للمسؤول / النائب / مشرف اللجنة فقط.
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

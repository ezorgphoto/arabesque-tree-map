-- يسمح بتفعيل الحساب فقط إذا كان البريد موجوداً في بطاقة موظف.
-- شغّله مرة من SQL Editor.

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
  );
$$;

grant execute on function public.can_activate_account(text) to anon, authenticated;

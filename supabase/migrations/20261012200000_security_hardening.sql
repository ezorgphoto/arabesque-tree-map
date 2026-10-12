-- Migration copy of ../security-hardening.sql
create or replace function public.is_executive()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'executive' from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.is_secretary()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'secretary' from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.is_team_member()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'team_member' from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_executive() to authenticated;
grant execute on function public.is_secretary() to authenticated;
grant execute on function public.is_team_member() to authenticated;

do $$ begin
  if to_regclass('public.audit_logs') is not null then
    alter table public.audit_logs enable row level security;
    drop policy if exists audit_logs_executive_select on public.audit_logs;
    create policy audit_logs_executive_select on public.audit_logs
      for select to authenticated using (public.is_executive());
    revoke insert, update, delete on public.audit_logs from authenticated;
    grant select on public.audit_logs to authenticated;
  end if;
end $$;

do $$ begin
  if to_regclass('public.profile_tag_options') is not null then
    alter table public.profile_tag_options enable row level security;
    drop policy if exists profile_tag_options_select on public.profile_tag_options;
    drop policy if exists profile_tag_options_insert on public.profile_tag_options;
    drop policy if exists profile_tag_options_delete on public.profile_tag_options;
    create policy profile_tag_options_select on public.profile_tag_options
      for select to authenticated using (true);
    create policy profile_tag_options_insert on public.profile_tag_options
      for insert to authenticated with check (
        exists (select 1 from public.employees e where e.user_id = auth.uid() and e.app_role in ('manager', 'deputy', 'supervisor'))
      );
    create policy profile_tag_options_delete on public.profile_tag_options
      for delete to authenticated using (
        exists (select 1 from public.employees e where e.user_id = auth.uid() and e.app_role in ('manager', 'deputy'))
      );
  end if;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.executive_tasks;
exception when duplicate_object then null; when undefined_table then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.executive_decisions;
exception when duplicate_object then null; when undefined_table then null; when undefined_object then null;
end $$;

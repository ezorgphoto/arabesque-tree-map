-- Dynamic Reports Hub schema.
-- Reconciles the `reports` table with the app's Reports Hub (src/lib/reports-hub.ts):
-- per-department dynamic reports stored as JSONB in `report_data`, plus a `report-files`
-- storage bucket for optional attachments. Supersedes the earlier reports schema.

drop table if exists public.reports cascade;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  department_type text not null,
  submitter_name text not null default '',
  report_data jsonb not null default '{}'::jsonb,
  file_url text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.reports to anon, authenticated;
grant all on public.reports to service_role;

alter table public.reports enable row level security;

drop policy if exists "reports_open" on public.reports;
create policy "reports_open" on public.reports
  for all to anon, authenticated using (true) with check (true);

create index reports_department_type_idx on public.reports (department_type);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_report_data_idx on public.reports using gin (report_data);

-- Storage bucket for report attachments (PDF / images).
insert into storage.buckets (id, name, public)
values ('report-files', 'report-files', false)
on conflict (id) do nothing;

drop policy if exists "report_files_read" on storage.objects;
drop policy if exists "report_files_insert" on storage.objects;
drop policy if exists "report_files_update" on storage.objects;
drop policy if exists "report_files_delete" on storage.objects;

create policy "report_files_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'report-files');
create policy "report_files_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'report-files');
create policy "report_files_update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'report-files') with check (bucket_id = 'report-files');
create policy "report_files_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'report-files');

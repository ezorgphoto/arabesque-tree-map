-- =====================================================================
-- إعداد كامل لمشروع Supabase الجديد (فارغ) — نظام الإدارة التنفيذية
-- شغّله مرة واحدة من: Dashboard → SQL Editor → New query → Run
-- يبني الجداول + بيانات أولية تجريبية + مركز التقارير + الإشعارات
-- =====================================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- ---------- الفروع ----------
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  lat double precision not null default 24.7136,
  lng double precision not null default 46.6753,
  manager text not null default '',
  employees_count integer not null default 0,
  revenue numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.branches to anon, authenticated;
grant all on public.branches to service_role;
alter table public.branches enable row level security;
drop policy if exists "branches_open" on public.branches;
create policy "branches_open" on public.branches
  for all to anon, authenticated using (true) with check (true);

-- ---------- الموظفون ----------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text not null default '',
  department text not null default '',
  email text not null default '',
  phone text not null default '',
  salary numeric not null default 0,
  status text not null default 'active',
  branch_id uuid references public.branches(id) on delete set null,
  hired_at date not null default current_date,
  created_at timestamptz not null default now(),
  personality_type text not null default '',
  strengths text not null default '',
  problems text not null default '',
  profile_notes text not null default '',
  intellectual_level text not null default '',
  religious_level text not null default '',
  training_level text not null default ''
);
grant select, insert, update, delete on public.employees to anon, authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
drop policy if exists "employees_open" on public.employees;
create policy "employees_open" on public.employees
  for all to anon, authenticated using (true) with check (true);

-- حقول الملف الشخصي إن كان الجدول موجوداً مسبقاً بدونها
alter table public.employees
  add column if not exists personality_type text not null default '',
  add column if not exists strengths text not null default '',
  add column if not exists problems text not null default '',
  add column if not exists profile_notes text not null default '',
  add column if not exists intellectual_level text not null default '',
  add column if not exists religious_level text not null default '',
  add column if not exists training_level text not null default '';

-- ---------- المهام ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  assignee text not null default '',
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to anon, authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
drop policy if exists "tasks_open" on public.tasks;
create policy "tasks_open" on public.tasks
  for all to anon, authenticated using (true) with check (true);

-- ---------- الهيكل التنظيمي ----------
create table if not exists public.org_nodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  person text not null default '',
  department text not null default '',
  notes text not null default '',
  parent_id uuid references public.org_nodes(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.org_nodes to anon, authenticated;
grant all on public.org_nodes to service_role;
alter table public.org_nodes enable row level security;
drop policy if exists "org_nodes_open" on public.org_nodes;
create policy "org_nodes_open" on public.org_nodes
  for all to anon, authenticated using (true) with check (true);

-- ---------- مركز التقارير (JSONB) ----------
drop table if exists public.reports cascade;
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  department_type text not null,
  submitter_name text not null default '',
  report_data jsonb not null default '{}'::jsonb,
  file_url text not null default '',
  employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reports to anon, authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
drop policy if exists "reports_open" on public.reports;
create policy "reports_open" on public.reports
  for all to anon, authenticated using (true) with check (true);
create index if not exists reports_department_type_idx on public.reports (department_type);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_report_data_idx on public.reports using gin (report_data);
create index if not exists reports_employee_id_idx on public.reports (employee_id);

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

-- ---------- المخطط الأسبوعي ----------
create table if not exists public.weekly_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  day_of_week smallint not null default 0,
  start_time time not null default '08:00',
  end_time time not null default '09:00',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.weekly_schedule to anon, authenticated;
grant all on public.weekly_schedule to service_role;
alter table public.weekly_schedule enable row level security;
drop policy if exists "weekly_schedule open access" on public.weekly_schedule;
create policy "weekly_schedule open access" on public.weekly_schedule
  for all to anon, authenticated using (true) with check (true);
drop trigger if exists update_weekly_schedule_updated_at on public.weekly_schedule;
create trigger update_weekly_schedule_updated_at
  before update on public.weekly_schedule
  for each row execute function public.update_updated_at_column();

-- ---------- إشعارات داخل التطبيق ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  message text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to anon, authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
drop policy if exists "notifications open access" on public.notifications;
create policy "notifications open access" on public.notifications
  for all to anon, authenticated using (true) with check (true);

-- ---------- اشتراكات Web Push ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_open" on public.push_subscriptions;
create policy "push_subscriptions_open" on public.push_subscriptions
  for all to anon, authenticated using (true) with check (true);

-- =====================================================================
-- بيانات أولية (تُضاف فقط إن كانت الجداول فارغة)
-- =====================================================================
insert into public.branches (id, name, city, lat, lng, manager, employees_count, revenue, notes)
select * from (values
  ('11111111-1111-1111-1111-111111111111'::uuid,'الفرع الرئيسي','الرياض',24.7136,46.6753,'أحمد العتيبي',48,1250000::numeric,'المقر الرئيسي'),
  ('22222222-2222-2222-2222-222222222222'::uuid,'فرع جدة','جدة',21.4858,39.1925,'سارة الحربي',26,780000::numeric,'المنطقة الغربية'),
  ('33333333-3333-3333-3333-333333333333'::uuid,'فرع دمشق','دمشق',33.5138,36.2765,'ليلى نجار',18,410000::numeric,'بلاد الشام')
) as v(id, name, city, lat, lng, manager, employees_count, revenue, notes)
where not exists (select 1 from public.branches limit 1);

insert into public.employees (full_name, job_title, department, email, phone, salary, status, branch_id)
select * from (values
  ('أحمد العتيبي','المدير التنفيذي','الإدارة العليا','ahmad@corp.sa','0501112233',32000::numeric,'active','11111111-1111-1111-1111-111111111111'::uuid),
  ('سارة الحربي','مديرة المبيعات','المبيعات','sara@corp.sa','0502223344',21000::numeric,'active','22222222-2222-2222-2222-222222222222'::uuid),
  ('ليلى نجار','مديرة الموارد البشرية','الموارد البشرية','laila@corp.sa','0503334455',19500::numeric,'active','33333333-3333-3333-3333-333333333333'::uuid),
  ('خالد المطيري','محلل مالي','المالية','khaled@corp.sa','0504445566',14000::numeric,'active','11111111-1111-1111-1111-111111111111'::uuid),
  ('نور الدين حسن','مطور برمجيات','تقنية المعلومات','nour@corp.sa','0505556677',16500::numeric,'vacation','11111111-1111-1111-1111-111111111111'::uuid)
) as v(full_name, job_title, department, email, phone, salary, status, branch_id)
where not exists (select 1 from public.employees limit 1);

insert into public.tasks (title, description, status, priority, assignee, due_date, position)
select * from (values
  ('إعداد الميزانية الربعية','مراجعة أرقام الربع الحالي','todo','high','خالد المطيري', current_date + 7, 0),
  ('توظيف مطورين جدد','فتح ثلاث شواغر تقنية','in_progress','medium','ليلى نجار', current_date + 14, 0),
  ('إطلاق حملة تسويقية','حملة الفرع الغربي','review','high','سارة الحربي', current_date + 3, 0),
  ('تحديث سياسة العمل','اعتماد اللائحة الجديدة','done','low','أحمد العتيبي', current_date - 2, 0)
) as v(title, description, status, priority, assignee, due_date, position)
where not exists (select 1 from public.tasks limit 1);

insert into public.org_nodes (id, title, person, department, notes, parent_id, position)
select * from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid,'الرئيس التنفيذي','أحمد العتيبي','الإدارة العليا','مسؤول عن الاستراتيجية العامة', null::uuid, 0),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid,'إدارة المالية','خالد المطيري','المالية','', 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 0),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid,'إدارة المبيعات','سارة الحربي','المبيعات','تغطي كافة الفروع', 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 1),
  ('aaaaaaaa-0000-0000-0000-000000000004'::uuid,'الموارد البشرية','ليلى نجار','الموارد البشرية','', 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2),
  ('aaaaaaaa-0000-0000-0000-000000000005'::uuid,'فريق التطوير','نور الدين حسن','تقنية المعلومات','', 'aaaaaaaa-0000-0000-0000-000000000002'::uuid, 0)
) as v(id, title, person, department, notes, parent_id, position)
where not exists (select 1 from public.org_nodes limit 1);

insert into public.weekly_schedule (title, day_of_week, start_time, end_time, description)
select * from (values
  ('اجتماع القيادة الأسبوعي', 0::smallint, '09:00'::time, '10:00'::time, 'مراجعة مؤشرات الأداء وخطة الأسبوع'),
  ('مراجعة تقارير الأقسام', 1::smallint, '11:00'::time, '12:00'::time, 'تدقيق التقارير الواردة'),
  ('جلسة تخطيط الحملات الدعوية', 2::smallint, '14:00'::time, '16:00'::time, 'صياغة الخطة التنفيذية'),
  ('متابعة الفروع الميدانية', 3::smallint, '10:00'::time, '11:00'::time, 'اتصال دوري مع مدراء الفروع'),
  ('تدريب بدني', 4::smallint, '17:00'::time, '18:00'::time, 'برنامج اللياقة الأسبوعي')
) as v(title, day_of_week, start_time, end_time, description)
where not exists (select 1 from public.weekly_schedule limit 1);

insert into public.notifications (title, message, is_read)
select * from (values
  ('اجتماع قادم', 'اجتماع القيادة الأسبوعي يبدأ يوم الأحد الساعة 09:00.', false),
  ('تقرير بانتظار المراجعة', 'هناك تقرير جديد بانتظار اعتمادك.', false),
  ('تذكير بالمخطط الأسبوعي', 'راجع مواعيد هذا الأسبوع.', false)
) as v(title, message, is_read)
where not exists (select 1 from public.notifications limit 1);

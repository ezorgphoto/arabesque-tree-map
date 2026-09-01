
CREATE TABLE public.branches (
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO anon, authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_open" ON public.branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.employees (
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
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO anon, authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_open" ON public.employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.tasks (
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_open" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.org_nodes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  person text not null default '',
  department text not null default '',
  notes text not null default '',
  parent_id uuid references public.org_nodes(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_nodes TO anon, authenticated;
GRANT ALL ON public.org_nodes TO service_role;
ALTER TABLE public.org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_nodes_open" ON public.org_nodes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.branches (id, name, city, lat, lng, manager, employees_count, revenue, notes) VALUES
 ('11111111-1111-1111-1111-111111111111','الفرع الرئيسي','الرياض',24.7136,46.6753,'أحمد العتيبي',48,1250000,'المقر الرئيسي للشركة'),
 ('22222222-2222-2222-2222-222222222222','فرع جدة','جدة',21.4858,39.1925,'سارة الحربي',26,780000,'يغطي المنطقة الغربية'),
 ('33333333-3333-3333-3333-333333333333','فرع دمشق','دمشق',33.5138,36.2765,'ليلى نجار',18,410000,'يغطي بلاد الشام');

INSERT INTO public.employees (full_name, job_title, department, email, phone, salary, status, branch_id) VALUES
 ('أحمد العتيبي','المدير التنفيذي','الإدارة العليا','ahmad@corp.sa','0501112233',32000,'active','11111111-1111-1111-1111-111111111111'),
 ('سارة الحربي','مديرة المبيعات','المبيعات','sara@corp.sa','0502223344',21000,'active','22222222-2222-2222-2222-222222222222'),
 ('ليلى نجار','مديرة الموارد البشرية','الموارد البشرية','laila@corp.sa','0503334455',19500,'active','33333333-3333-3333-3333-333333333333'),
 ('خالد المطيري','محلل مالي','المالية','khaled@corp.sa','0504445566',14000,'active','11111111-1111-1111-1111-111111111111'),
 ('نور الدين حسن','مطور برمجيات','تقنية المعلومات','nour@corp.sa','0505556677',16500,'vacation','11111111-1111-1111-1111-111111111111');

INSERT INTO public.tasks (title, description, status, priority, assignee, due_date, position) VALUES
 ('إعداد الميزانية الربعية','مراجعة أرقام الربع الحالي','todo','high','خالد المطيري', current_date + 7, 0),
 ('توظيف مطورين جدد','فتح ثلاث شواغر تقنية','in_progress','medium','ليلى نجار', current_date + 14, 0),
 ('إطلاق حملة تسويقية','حملة الفرع الغربي','review','high','سارة الحربي', current_date + 3, 0),
 ('تحديث سياسة العمل','اعتماد اللائحة الجديدة','done','low','أحمد العتيبي', current_date - 2, 0);

INSERT INTO public.org_nodes (id, title, person, department, notes, parent_id, position) VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001','الرئيس التنفيذي','أحمد العتيبي','الإدارة العليا','مسؤول عن الاستراتيجية العامة', null, 0),
 ('aaaaaaaa-0000-0000-0000-000000000002','إدارة المالية','خالد المطيري','المالية','', 'aaaaaaaa-0000-0000-0000-000000000001', 0),
 ('aaaaaaaa-0000-0000-0000-000000000003','إدارة المبيعات','سارة الحربي','المبيعات','تغطي كافة الفروع', 'aaaaaaaa-0000-0000-0000-000000000001', 1),
 ('aaaaaaaa-0000-0000-0000-000000000004','الموارد البشرية','ليلى نجار','الموارد البشرية','', 'aaaaaaaa-0000-0000-0000-000000000001', 2),
 ('aaaaaaaa-0000-0000-0000-000000000005','فريق التطوير','نور الدين حسن','تقنية المعلومات','', 'aaaaaaaa-0000-0000-0000-000000000002', 0);

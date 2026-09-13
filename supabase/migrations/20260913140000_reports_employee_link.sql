-- ربط التقارير بالموظفين: عمود employee_id في جدول reports يشير إلى الموظف المعني
-- بالتقرير، ليظهر ضمن ملف الموظف وتُتاح التصفية حسبه في مركز التقارير.
-- idempotent وآمن (nullable، ومع حذف الموظف يُضبط إلى NULL).

alter table public.reports
  add column if not exists employee_id uuid references public.employees(id) on delete set null;

create index if not exists reports_employee_id_idx on public.reports (employee_id);

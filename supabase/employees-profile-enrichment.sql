-- =============================================================================
-- Employee profile enrichment: study/work/sharia + level notes + tag options
-- Run in Supabase SQL Editor (idempotent)
-- =============================================================================

alter table public.employees
  add column if not exists studies text not null default '',
  add column if not exists is_employed boolean not null default false,
  add column if not exists work_title text not null default '',
  add column if not exists sharia_program text not null default '',
  add column if not exists level_notes text not null default '';

-- Shared selectable tags for strengths / problems / general notes
create table if not exists public.profile_tag_options (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('strength', 'problem', 'note')),
  label text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (category, label)
);

create index if not exists profile_tag_options_category_idx
  on public.profile_tag_options (category);

alter table public.profile_tag_options enable row level security;

drop policy if exists profile_tag_options_select on public.profile_tag_options;
drop policy if exists profile_tag_options_insert on public.profile_tag_options;
drop policy if exists profile_tag_options_delete on public.profile_tag_options;

-- Authenticated users can read; leadership can insert/delete (same pattern as employees write)
create policy profile_tag_options_select on public.profile_tag_options
  for select to authenticated
  using (true);

create policy profile_tag_options_insert on public.profile_tag_options
  for insert to authenticated
  with check (true);

create policy profile_tag_options_delete on public.profile_tag_options
  for delete to authenticated
  using (true);

grant select, insert, delete on public.profile_tag_options to authenticated;
grant all on public.profile_tag_options to service_role;

-- Seed default options (ignore duplicates)
insert into public.profile_tag_options (category, label) values
  ('strength', 'التزام وانضباط'),
  ('strength', 'قدرة تحليلية'),
  ('strength', 'تواصل فعّال'),
  ('strength', 'قيادة ميدانية'),
  ('strength', 'إبداع ومبادرة'),
  ('strength', 'عمل جماعي'),
  ('strength', 'دقة في التنفيذ'),
  ('strength', 'تحمل المسؤولية'),
  ('problem', 'مشكلة عائلية'),
  ('problem', 'ضغط دراسي'),
  ('problem', 'ضعف الالتزام بالمواعيد'),
  ('problem', 'تحديات مالية'),
  ('problem', 'خلاف داخل الفريق'),
  ('problem', 'انقطاع عن البرنامج'),
  ('problem', 'حاجة لمتابعة شخصية'),
  ('problem', 'إرهاق أو احتراق وظيفي'),
  ('note', 'يحتاج زيارة ميدانية'),
  ('note', 'مرشح لترقية'),
  ('note', 'تحت التجربة'),
  ('note', 'يحتاج تدريب إضافي'),
  ('note', 'متابعة أسبوعية'),
  ('note', 'أولوية عالية للمتابعة')
on conflict (category, label) do nothing;

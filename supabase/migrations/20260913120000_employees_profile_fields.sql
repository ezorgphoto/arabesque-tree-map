-- توسيع ملف الموظف: حقول لمتابعة نمط الشخصية والمشاكل والملاحظات والمستويات
-- (الفكري، الشرعي، التدريبي). حقول إضافية آمنة بقيَم افتراضية فارغة، ولا تؤثر
-- على الأعمدة الحالية. idempotent عبر "add column if not exists".

alter table public.employees
  add column if not exists personality_type text not null default '',
  add column if not exists strengths text not null default '',
  add column if not exists problems text not null default '',
  add column if not exists profile_notes text not null default '',
  add column if not exists intellectual_level text not null default '',
  add column if not exists religious_level text not null default '',
  add column if not exists training_level text not null default '';

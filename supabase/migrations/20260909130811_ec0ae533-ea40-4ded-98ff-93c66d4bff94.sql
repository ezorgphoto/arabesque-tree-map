ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS department_type text NOT NULL DEFAULT 'advocacy',
  ADD COLUMN IF NOT EXISTS submitter_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS file_url text NOT NULL DEFAULT '';

ALTER TABLE public.reports ALTER COLUMN title SET DEFAULT '';

CREATE INDEX IF NOT EXISTS reports_department_type_idx ON public.reports (department_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
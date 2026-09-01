CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text NOT NULL DEFAULT '',
  report_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'submitted',
  priority text NOT NULL DEFAULT 'medium',
  submitted_by text NOT NULL DEFAULT '',
  reviewer text NOT NULL DEFAULT '',
  period_date date NOT NULL DEFAULT CURRENT_DATE,
  review_notes text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reports_open ON public.reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX reports_status_idx ON public.reports (status);
CREATE INDEX reports_fields_idx ON public.reports USING gin (fields);

INSERT INTO public.reports (title, department, report_type, status, priority, submitted_by, reviewer, period_date, review_notes, fields, metrics) VALUES
('تقرير المبيعات الشهري', 'المبيعات', 'financial', 'approved', 'high', 'سارة القحطاني', 'م. خالد العتيبي', '2026-08-01', 'أداء ممتاز مقارنة بالشهر الماضي', '{"المنطقة":"الرياض","قناة البيع":"فروع مباشرة","أبرز المنتجات":"باقات الشركات"}', '{"الإيرادات":480000,"عدد الصفقات":132,"نسبة النمو":12}'),
('تقرير الموارد البشرية الربعي', 'الموارد البشرية', 'hr', 'in_review', 'medium', 'نورة الشمري', 'أ. فهد الدوسري', '2026-07-01', '', '{"عدد التعيينات":"9","برامج التدريب":"3 برامج"}', '{"معدل الدوران":6,"عدد الموظفين":214,"رضا الموظفين":87}'),
('تقرير الصيانة التشغيلية', 'العمليات', 'operations', 'submitted', 'high', 'ماجد الحربي', '', '2026-08-15', '', '{"الفرع":"جدة - الحمراء","نوع العطل":"تكييف مركزي"}', '{"عدد البلاغات":24,"متوسط زمن الإصلاح":3,"التكلفة":18500}'),
('تقرير الجودة والامتثال', 'الجودة', 'compliance', 'rejected', 'low', 'ريم الزهراني', 'د. منى السالم', '2026-06-01', 'ينقص التقرير مرفقات التدقيق الداخلي', '{"معيار المراجعة":"ISO 9001","الجهة":"لجنة داخلية"}', '{"نسبة الامتثال":78,"عدد الملاحظات":12}'),
('تقرير التسويق الرقمي', 'التسويق', 'marketing', 'draft', 'medium', 'عبدالله المطيري', '', '2026-08-20', '', '{"الحملة":"إطلاق الهوية الجديدة","المنصات":"إنستغرام، لينكدإن"}', '{"الوصول":320000,"التفاعل":4,"تكلفة الاكتساب":27}');
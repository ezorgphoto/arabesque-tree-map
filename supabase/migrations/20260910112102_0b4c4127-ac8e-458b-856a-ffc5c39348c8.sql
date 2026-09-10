CREATE TABLE public.weekly_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  day_of_week SMALLINT NOT NULL DEFAULT 0,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '09:00',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_schedule TO anon, authenticated;
GRANT ALL ON public.weekly_schedule TO service_role;
ALTER TABLE public.weekly_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_schedule open access" ON public.weekly_schedule FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_weekly_schedule_updated_at BEFORE UPDATE ON public.weekly_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications open access" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.weekly_schedule (title, day_of_week, start_time, end_time, description) VALUES
('اجتماع القيادة الأسبوعي', 0, '09:00', '10:00', 'مراجعة مؤشرات الأداء وخطة الأسبوع'),
('مراجعة تقارير الأقسام', 1, '11:00', '12:00', 'تدقيق التقارير الواردة من الأقسام التسعة'),
('جلسة تخطيط الحملات الدعوية', 2, '14:00', '16:00', 'صياغة الخطة التنفيذية للحملة القادمة'),
('متابعة الفروع الميدانية', 3, '10:00', '11:00', 'اتصال دوري مع مدراء الفروع'),
('تدريب بدني', 4, '17:00', '18:00', 'برنامج اللياقة الأسبوعي');

INSERT INTO public.notifications (title, message, is_read) VALUES
('اجتماع قادم', 'اجتماع القيادة الأسبوعي يبدأ يوم الأحد الساعة 09:00.', false),
('تقرير بانتظار المراجعة', 'هناك تقرير جديد من قسم النشر الرقمي بانتظار اعتمادك.', false),
('تذكير بالمخطط الأسبوعي', 'لم تُضف بعد أي مواعيد ليوم الجمعة.', false),
('تحديث مالي', 'تم تسجيل حركة مالية جديدة في السجل المالي.', true);
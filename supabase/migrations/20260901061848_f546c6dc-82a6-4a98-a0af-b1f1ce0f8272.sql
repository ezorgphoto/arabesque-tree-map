CREATE POLICY "report_files_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'report-files');
CREATE POLICY "report_files_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'report-files');
CREATE POLICY "report_files_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'report-files') WITH CHECK (bucket_id = 'report-files');
CREATE POLICY "report_files_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'report-files');
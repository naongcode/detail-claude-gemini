-- 인증된 사용자도 storage 업로드/조회/삭제 허용

DROP POLICY IF EXISTS "allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "allow anon reads" ON storage.objects;
DROP POLICY IF EXISTS "allow anon deletes" ON storage.objects;

CREATE POLICY "allow uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-assets');

CREATE POLICY "allow reads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-assets');

CREATE POLICY "allow deletes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-assets');

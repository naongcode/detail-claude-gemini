-- 업로드를 인증된 사용자만 가능하도록 변경
-- 읽기는 공개 유지 (생성 이미지 URL 공개 제공)

DROP POLICY IF EXISTS "allow uploads" ON storage.objects;

CREATE POLICY "allow uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-assets');

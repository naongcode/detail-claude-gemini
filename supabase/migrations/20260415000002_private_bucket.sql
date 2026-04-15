-- ============================================================
-- 20260415000002_private_bucket.sql
-- Storage 버킷을 private으로 전환
-- 파일 접근은 /api/projects/[id]/files 프록시 라우트를 통해서만 허용
-- (서버사이드는 service role key로 직접 download() 호출)
-- ============================================================

-- 버킷 private으로 변경
UPDATE storage.buckets SET public = false WHERE id = 'project-assets';

-- 기존 anon/public read 정책 제거
DROP POLICY IF EXISTS "allow reads"      ON storage.objects;
DROP POLICY IF EXISTS "allow anon reads" ON storage.objects;
DROP POLICY IF EXISTS "allow uploads"    ON storage.objects;
DROP POLICY IF EXISTS "allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "allow deletes"    ON storage.objects;
DROP POLICY IF EXISTS "allow anon deletes" ON storage.objects;

-- service role은 RLS를 우회하므로 별도 정책 불필요
-- (서버사이드 코드는 SUPABASE_SERVICE_ROLE_KEY로 동작)

-- projects 테이블에 soft delete 컬럼 추가
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 삭제된 프로젝트 조회 제외 인덱스
CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
  ON public.projects (deleted_at)
  WHERE deleted_at IS NULL;

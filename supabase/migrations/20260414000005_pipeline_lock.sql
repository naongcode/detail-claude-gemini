-- 파이프라인 중복 실행 방지용 락 컬럼
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pipeline_locked_at TIMESTAMPTZ;

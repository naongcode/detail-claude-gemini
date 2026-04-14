-- pipeline_status: 파이프라인 진행 상태 영속화
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pipeline_status JSONB DEFAULT NULL;

COMMENT ON COLUMN public.projects.pipeline_status IS
  '{"stage":"image_generation","completed":["hero","pain"],"failed":"solution","error":"..."}';

-- project_versions: 렌더링 완료 시 버전 스냅샷 저장
CREATE TABLE IF NOT EXISTS public.project_versions (
  id              BIGSERIAL PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version         INT  NOT NULL,
  page_design     JSONB,
  final_png_path  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS project_versions_project_version_idx
  ON public.project_versions (project_id, version);

-- RLS: 프로젝트 소유자만 조회/삽입
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "project_versions_owner_select"
  ON public.project_versions FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "project_versions_service_all"
  ON public.project_versions FOR ALL
  USING (auth.role() = 'service_role');

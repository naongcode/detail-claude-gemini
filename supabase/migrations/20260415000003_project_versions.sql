-- 20260415000003_project_versions.sql
-- project_versions 테이블 생성 + RLS 정책
-- (20260414000012의 CREATE POLICY IF NOT EXISTS 문법 오류 수정본)

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

ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_versions_owner_select" ON public.project_versions;
CREATE POLICY "project_versions_owner_select"
  ON public.project_versions FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "project_versions_service_all" ON public.project_versions;
CREATE POLICY "project_versions_service_all"
  ON public.project_versions FOR ALL
  USING (auth.role() = 'service_role');

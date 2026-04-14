-- profiles 테이블에 is_admin 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- api_cost_log 테이블
CREATE TABLE IF NOT EXISTS public.api_cost_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id    TEXT,
  provider      TEXT NOT NULL,      -- 'openai' | 'anthropic' | 'gemini'
  operation     TEXT NOT NULL,      -- 'brief' | 'research' | 'page_design' | 'image'
  input_tokens  INT,
  output_tokens INT,
  image_count   INT,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 관리자만 전체 조회 가능, 일반 사용자는 자기 것만
ALTER TABLE public.api_cost_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_costs" ON public.api_cost_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_all_costs" ON public.api_cost_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS api_cost_log_user_id_idx ON public.api_cost_log (user_id);
CREATE INDEX IF NOT EXISTS api_cost_log_created_at_idx ON public.api_cost_log (created_at DESC);
CREATE INDEX IF NOT EXISTS api_cost_log_provider_idx ON public.api_cost_log (provider);

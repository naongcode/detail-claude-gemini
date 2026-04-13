-- ============================================================
-- 20260414000001_schema.sql
-- 전체 스키마 정의 (idempotent)
-- ============================================================

-- ── 1. projects 테이블 ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id),
  brief       JSONB,
  research    JSONB,
  page_design JSONB,
  html_page   TEXT,
  regen_count INT NOT NULL DEFAULT 0,
  regen_limit INT NOT NULL DEFAULT 5,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 기존 테이블에 컬럼이 없을 경우 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id     UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS regen_count INT NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS regen_limit INT NOT NULL DEFAULT 5;

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_all" ON projects;
CREATE POLICY "owner_all" ON projects
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Storage 버킷 + 정책 ────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "allow anon uploads" ON storage.objects;
CREATE POLICY "allow anon uploads"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'project-assets');

DROP POLICY IF EXISTS "allow anon reads" ON storage.objects;
CREATE POLICY "allow anon reads"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'project-assets');

DROP POLICY IF EXISTS "allow anon deletes" ON storage.objects;
CREATE POLICY "allow anon deletes"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'project-assets');

-- ── 3. user_credits 테이블 ────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_credits (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance        INT NOT NULL DEFAULT 0,
  used_total     INT NOT NULL DEFAULT 0,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  phone_hash     TEXT UNIQUE,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_read" ON user_credits;
CREATE POLICY "owner_read" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- ── 4. credit_transactions 테이블 ─────────────────────────────

CREATE TABLE IF NOT EXISTS credit_transactions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  delta      INT NOT NULL,
  reason     TEXT,
  project_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_read" ON credit_transactions;
CREATE POLICY "owner_read" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ── 5. 가입 시 user_credits 자동 생성 트리거 ─────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 6. 크레딧 차감 함수 ──────────────────────────────────────

CREATE OR REPLACE FUNCTION deduct_credit(
  p_user_id UUID, p_project_id TEXT, p_cost NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INT;
  int_cost INT;
BEGIN
  int_cost := CEIL(p_cost);
  SELECT balance INTO current_balance
    FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < int_cost THEN
    RETURN FALSE;
  END IF;

  UPDATE user_credits
    SET balance    = balance - int_cost,
        used_total = used_total + int_cost,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, delta, reason, project_id)
    VALUES (p_user_id, -int_cost, 'pipeline_run', p_project_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ── 7. 크레딧 충전 함수 ──────────────────────────────────────

CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID, p_delta INT, p_reason TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance)
    VALUES (p_user_id, p_delta)
    ON CONFLICT (user_id) DO UPDATE
      SET balance    = user_credits.balance + p_delta,
          updated_at = now();

  INSERT INTO credit_transactions (user_id, delta, reason)
    VALUES (p_user_id, p_delta, p_reason);
END;
$$ LANGUAGE plpgsql;

-- ── 8. 카카오 인증 + 크레딧 지급 함수 ────────────────────────

CREATE OR REPLACE FUNCTION verify_phone_and_grant_credit(
  p_user_id UUID, p_phone_hash TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_credits WHERE phone_hash = p_phone_hash
  ) THEN
    RAISE EXCEPTION 'ALREADY_USED';
  END IF;

  UPDATE user_credits
    SET phone_verified = true,
        phone_hash     = p_phone_hash,
        balance        = balance + 1,
        updated_at     = now()
    WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, delta, reason)
    VALUES (p_user_id, 1, 'kakao_verified_bonus');
END;
$$ LANGUAGE plpgsql;

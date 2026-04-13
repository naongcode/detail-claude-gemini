-- ============================================================
-- 20260414000002_credits.sql
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. 크레딧 잔액 테이블
CREATE TABLE IF NOT EXISTS user_credits (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance        INT NOT NULL DEFAULT 0,
  used_total     INT NOT NULL DEFAULT 0,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  phone_hash     TEXT UNIQUE,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. 크레딧 트랜잭션 로그
CREATE TABLE IF NOT EXISTS credit_transactions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  delta      INT NOT NULL,
  reason     TEXT,
  project_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_read" ON user_credits;
CREATE POLICY "owner_read" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_read" ON credit_transactions;
CREATE POLICY "owner_read" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 4. 원자적 크레딧 차감 함수
CREATE OR REPLACE FUNCTION deduct_credit(
  p_user_id UUID, p_project_id TEXT, p_cost NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INT;
  int_cost INT;
BEGIN
  int_cost := CEIL(p_cost);
  SELECT balance INTO current_balance FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < int_cost THEN RETURN FALSE; END IF;

  UPDATE user_credits
    SET balance = balance - int_cost,
        used_total = used_total + int_cost,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, delta, reason, project_id)
    VALUES (p_user_id, -int_cost, 'pipeline_run', p_project_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. 크레딧 충전 함수
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID, p_delta INT, p_reason TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance)
    VALUES (p_user_id, p_delta)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = user_credits.balance + p_delta,
          updated_at = now();

  INSERT INTO credit_transactions (user_id, delta, reason)
    VALUES (p_user_id, p_delta, p_reason);
END;
$$ LANGUAGE plpgsql;

-- 6. 카카오 인증 + 크레딧 지급 함수
CREATE OR REPLACE FUNCTION verify_phone_and_grant_credit(
  p_user_id UUID, p_phone_hash TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_credits WHERE phone_hash = p_phone_hash) THEN
    RAISE EXCEPTION 'ALREADY_USED';
  END IF;

  UPDATE user_credits
    SET phone_verified = true,
        phone_hash = p_phone_hash,
        balance = balance + 1,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, delta, reason)
    VALUES (p_user_id, 1, 'kakao_verified_bonus');
END;
$$ LANGUAGE plpgsql;

-- 7. 001_auth.sql의 handle_new_user 트리거가 user_credits 행을 자동 생성하므로
--    신규 가입자는 balance=0으로 시작

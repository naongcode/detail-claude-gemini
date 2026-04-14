-- credit_transactions에 project_id unique constraint 추가
-- → 같은 프로젝트에 대한 차감은 DB 레벨에서 한 번만 허용

ALTER TABLE credit_transactions
  ADD COLUMN IF NOT EXISTS is_project_charge BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS idx_credit_transactions_project_charge;
CREATE UNIQUE INDEX idx_credit_transactions_project_charge
  ON credit_transactions (user_id, project_id)
  WHERE is_project_charge = true;

-- deduct_credit 함수: project_id 중복 시 이미 차감된 것으로 간주 (원자적 처리)
CREATE OR REPLACE FUNCTION deduct_credit(
  p_user_id UUID, p_project_id TEXT, p_cost NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INT;
  int_cost INT;
BEGIN
  int_cost := CEIL(p_cost);

  -- 이미 해당 프로젝트에 차감된 기록이 있으면 true 반환 (중복 차감 방지)
  IF EXISTS (
    SELECT 1 FROM credit_transactions
    WHERE user_id = p_user_id
      AND project_id = p_project_id
      AND is_project_charge = true
  ) THEN
    RETURN TRUE;
  END IF;

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

  -- is_project_charge = true로 기록 → unique index로 중복 방지
  INSERT INTO credit_transactions (user_id, delta, reason, project_id, is_project_charge)
    VALUES (p_user_id, -int_cost, 'brief_generation', p_project_id, true);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

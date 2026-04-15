-- ============================================================
-- 20260415000001_payment_security.sql
-- 결제 보안 강화
-- 1. add_regen_tickets: 원자적 재생성권 지급 함수
-- 2. credit_transactions.reason unique index for purchase orderId dedup
-- ============================================================

-- 1. 재생성권 원자적 지급 함수
--    SELECT → UPDATE 패턴 대신 DB 레벨에서 원자적으로 처리
CREATE OR REPLACE FUNCTION add_regen_tickets(p_user_id UUID, p_delta INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, regen_tickets)
    VALUES (p_user_id, p_delta)
    ON CONFLICT (user_id) DO UPDATE
      SET regen_tickets = user_credits.regen_tickets + EXCLUDED.regen_tickets,
          updated_at    = now();
END;
$$ LANGUAGE plpgsql;

-- 2. 동일 orderId 중복 결제 방지
--    reason = 'purchase:{orderId}' 형식에만 unique 적용
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_purchase_reason
  ON credit_transactions (reason)
  WHERE reason LIKE 'purchase:%';

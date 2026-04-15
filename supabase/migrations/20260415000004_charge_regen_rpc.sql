-- 20260415000004_charge_regen_rpc.sql
-- 재생성 티켓 N장 원자적 차감 RPC
-- 무료권 우선 소모 → 부족분은 구매권으로 처리
-- FOR UPDATE 락으로 race condition 방지

CREATE OR REPLACE FUNCTION charge_regen(
  p_user_id   UUID,
  p_project_id TEXT,
  p_count     INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_regen_count      INT;
  v_regen_limit      INT;
  v_free_available   INT;
  v_free_used        INT;
  v_purchased_needed INT;
  v_regen_tickets    INT;
BEGIN
  -- 프로젝트 행 락 (동시 요청 직렬화)
  SELECT regen_count, regen_limit
  INTO   v_regen_count, v_regen_limit
  FROM   public.projects
  WHERE  id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND';
  END IF;

  v_free_available   := GREATEST(0, v_regen_limit - v_regen_count);
  v_free_used        := LEAST(v_free_available, p_count);
  v_purchased_needed := p_count - v_free_used;

  IF v_purchased_needed > 0 THEN
    -- user_credits 행 락
    SELECT regen_tickets
    INTO   v_regen_tickets
    FROM   public.user_credits
    WHERE  user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND OR v_regen_tickets < v_purchased_needed THEN
      RAISE EXCEPTION 'INSUFFICIENT_TICKETS';
    END IF;

    UPDATE public.user_credits
    SET    regen_tickets = regen_tickets - v_purchased_needed
    WHERE  user_id = p_user_id;
  END IF;

  IF v_free_used > 0 THEN
    UPDATE public.projects
    SET    regen_count = regen_count + v_free_used
    WHERE  id = p_project_id;
  END IF;

  RETURN jsonb_build_object(
    'free_used',      v_free_used,
    'purchased_used', v_purchased_needed
  );
END;
$$;

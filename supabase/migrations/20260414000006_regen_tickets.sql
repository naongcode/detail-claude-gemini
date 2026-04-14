-- 유저 공통 재생성권 컬럼 추가
-- 프로젝트 무료권(regen_count/regen_limit)과 별개로, 추가 구매한 재생성권
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS regen_tickets INT NOT NULL DEFAULT 0;

-- 트리거 생성 전에 가입한 기존 유저들의 user_credits 행 생성
INSERT INTO user_credits (user_id, balance)
SELECT id, 0
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

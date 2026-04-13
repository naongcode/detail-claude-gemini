-- ============================================================
-- 001_auth.sql
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. projects 테이블에 user_id 컬럼 추가
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. RLS 활성화 + 소유자 정책
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all" ON projects;
CREATE POLICY "owner_all" ON projects
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. 가입 시 user_credits 행 자동 생성 트리거
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

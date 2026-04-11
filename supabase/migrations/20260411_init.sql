-- projects 테이블
create table if not exists projects (
  id           text primary key,
  name         text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  brief        jsonb,
  research     jsonb,
  page_design  jsonb,
  html_page    text
);

-- Storage 버킷 (Supabase 대시보드에서 직접 생성 필요)
-- 버킷 이름: project-assets
-- Public: ON

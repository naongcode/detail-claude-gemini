-- Storage RLS 정책: anon 사용자의 project-assets 버킷 업로드 허용
-- (브라우저에서 직접 업로드 시 필요)

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

create policy "allow anon uploads"
on storage.objects for insert
to anon
with check (bucket_id = 'project-assets');

create policy "allow anon reads"
on storage.objects for select
to anon
using (bucket_id = 'project-assets');

create policy "allow anon deletes"
on storage.objects for delete
to anon
using (bucket_id = 'project-assets');

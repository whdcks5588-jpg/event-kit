-- 1. quiz-images 버킷 생성
insert into storage.buckets (id, name, public)
values ('quiz-images', 'quiz-images', true)
on conflict (id) do nothing;

-- 2. 공개 접근 권한 설정 (SELECT)
create policy "Allow public access to quiz-images 1"
on storage.objects for select
to public
using (bucket_id = 'quiz-images');

-- 3. 공개 업로드 권한 설정 (INSERT)
create policy "Allow public access to quiz-images 2"
on storage.objects for insert
to public
with check (bucket_id = 'quiz-images');

-- 4. 공개 수정 권한 설정 (UPDATE)
create policy "Allow public access to quiz-images 3"
on storage.objects for update
to public
using (bucket_id = 'quiz-images');

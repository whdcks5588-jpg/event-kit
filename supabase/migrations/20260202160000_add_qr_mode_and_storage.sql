-- 1. rooms 테이블에 room_show_qr_only 컬럼 추가
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_show_qr_only BOOLEAN DEFAULT FALSE;

-- 2. Storage 버킷 생성 (logos)
-- Supabase에서 storage.buckets 테이블에 직접 insert 하여 생성 가능
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS 정책 설정
-- 모든 사용자가 읽을 수 있도록 허용
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

-- 인증된 사용자가 업로드/수정/삭제 가능하도록 허용
-- 여기서는 간단하게 모든 anonymous 사용자가 logos 버킷에 대해 작업을 할 수 있게 허용 (개발 편의성)
CREATE POLICY "Allow All for logos" ON storage.objects FOR ALL 
USING (bucket_id = 'logos') 
WITH CHECK (bucket_id = 'logos');
+
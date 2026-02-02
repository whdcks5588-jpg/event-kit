-- rooms 테이블에 logo_url 컬럼 추가 및 기존 room_show_logo_only를 qr_show_fullscreen으로 의미 변경 (또는 새로 추가)
-- 여기서는 기존 room_show_logo_only를 QR 전체화면용으로 쓰고, logo_url을 추가하겠습니다.

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- RLS 정책 확인 (이미 있다면 무시)
-- rooms 테이블은 이미 정책이 설정되어 있을 것이므로 별도 추가는 하지 않음.

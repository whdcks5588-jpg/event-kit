-- rooms 테이블에 room_show_logo_only 컬럼 추가
alter table public.rooms
add column if not exists room_show_logo_only boolean default false;

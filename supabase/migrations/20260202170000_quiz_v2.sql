-- 퀴즈 프로젝트 테이블 생성
CREATE TABLE IF NOT EXISTS public.quiz_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 기존 quiz_sessions 테이블 업데이트
-- 1. project_id 컬럼 추가 (quiz_projects 참조)
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.quiz_projects(id) ON DELETE CASCADE;

-- 2. 배점(points) 컬럼 추가 (기본값 10)
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10 NOT NULL;

-- 3. 이미지 URL 컬럼 추가 (이미 있을 수 있지만 확실히 하기 위해)
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. 불필요한 컬럼 제거 (사용자 요청: 제한시간 제거)
-- ALTER TABLE public.quiz_sessions DROP COLUMN IF EXISTS time_limit_seconds; -- 기존 코드 호환성을 위해 유지하되 UI에서만 제거 권장. 하지만 요청이 명확하므로 제거 가능. 
-- 다만 기존 코드에서 이 컬럼을 참조할 수 있으므로, 일단 UI에서만 안 보이게 하고 나중에 정리하는 것이 안전함.

-- RLS 정책 설정
ALTER TABLE public.quiz_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Quiz Projects" ON public.quiz_projects FOR SELECT USING (true);
CREATE POLICY "Public Insert Quiz Projects" ON public.quiz_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Quiz Projects" ON public.quiz_projects FOR UPDATE USING (true);
CREATE POLICY "Public Delete Quiz Projects" ON public.quiz_projects FOR DELETE USING (true);

-- 실시간 통신 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_projects;

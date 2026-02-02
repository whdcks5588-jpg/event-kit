-- rooms 테이블에 퀴즈 관련 컬럼 추가 및 업데이트
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS quiz_project_id UUID REFERENCES public.quiz_projects(id) ON DELETE SET NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS quiz_phase TEXT DEFAULT 'waiting';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS quiz_current_index INTEGER DEFAULT 0;

-- quiz_phase 제약 조건 업데이트
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_quiz_phase_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_quiz_phase_check 
    CHECK (quiz_phase = ANY (ARRAY['waiting', 'question', 'grading', 'reveal', 'ranking', 'ended']));

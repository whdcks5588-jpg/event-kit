-- Missing columns in rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS quiz_project_id UUID REFERENCES public.quiz_projects(id) ON DELETE SET NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS quiz_phase TEXT DEFAULT 'waiting';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS quiz_current_index INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_show_logo_only BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_show_qr_only BOOLEAN DEFAULT false;

-- Add check constraint for quiz_phase if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_quiz_phase_check') THEN
        ALTER TABLE public.rooms ADD CONSTRAINT rooms_quiz_phase_check 
        CHECK (quiz_phase = ANY (ARRAY['waiting', 'question', 'grading', 'reveal', 'ranking', 'ended']));
    END IF;
END $$;

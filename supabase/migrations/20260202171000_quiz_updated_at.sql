ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

CREATE OR REPLACE TRIGGER update_quiz_sessions_updated_at
BEFORE UPDATE ON public.quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

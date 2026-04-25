-- Link each proctoring analytics row to the exact submitted exam take.

ALTER TABLE public.cheating_logs
  ADD COLUMN IF NOT EXISTS result_id UUID REFERENCES public.results(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS cheating_logs_result_id_key
  ON public.cheating_logs(result_id)
  WHERE result_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cheating_logs_exam_student
  ON public.cheating_logs(exam_id, student_id, created_at DESC);

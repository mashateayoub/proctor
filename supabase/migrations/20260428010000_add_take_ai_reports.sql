CREATE TABLE IF NOT EXISTS public.take_ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_text TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low',
  key_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS take_ai_reports_result_id_key
  ON public.take_ai_reports(result_id);

CREATE INDEX IF NOT EXISTS take_ai_reports_generated_at_idx
  ON public.take_ai_reports(generated_at DESC);

ALTER TABLE public.take_ai_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "take_ai_reports_select_teacher" ON public.take_ai_reports;
CREATE POLICY "take_ai_reports_select_teacher"
ON public.take_ai_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.exams e
    WHERE e.id = exam_id
      AND e.teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "take_ai_reports_insert_teacher" ON public.take_ai_reports;
CREATE POLICY "take_ai_reports_insert_teacher"
ON public.take_ai_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.exams e
    WHERE e.id = exam_id
      AND e.teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "take_ai_reports_update_teacher" ON public.take_ai_reports;
CREATE POLICY "take_ai_reports_update_teacher"
ON public.take_ai_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.exams e
    WHERE e.id = exam_id
      AND e.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.exams e
    WHERE e.id = exam_id
      AND e.teacher_id = auth.uid()
  )
);

-- Allow teachers to UPDATE questions for exams they own
DROP POLICY IF EXISTS "questions_update_teacher" ON public.questions;
CREATE POLICY "questions_update_teacher"
ON public.questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.exams e
    WHERE e.id = exam_id
      AND e.teacher_id = auth.uid()
  )
);

-- Allow teachers to DELETE questions for exams they own
DROP POLICY IF EXISTS "questions_delete_teacher" ON public.questions;
CREATE POLICY "questions_delete_teacher"
ON public.questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.exams e
    WHERE e.id = exam_id
      AND e.teacher_id = auth.uid()
  )
);

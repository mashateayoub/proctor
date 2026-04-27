-- Clean stale placeholder in-progress rows created by race conditions:
-- keep legitimate completed rows and remove empty in-progress duplicates.
DELETE FROM public.results r
WHERE r.status = 'in_progress'
  AND COALESCE(r.mcq_score, 0) = 0
  AND (r.coding_submissions IS NULL OR r.coding_submissions = '[]'::jsonb)
  AND EXISTS (
    SELECT 1
    FROM public.results c
    WHERE c.exam_id = r.exam_id
      AND c.student_id = r.student_id
      AND c.status = 'completed'
      AND c.created_at >= r.created_at
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.cheating_logs cl
    WHERE cl.result_id = r.id
  );

-- If multiple in-progress rows still exist for the same student+exam,
-- keep the newest and remove the rest.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY exam_id, student_id
      ORDER BY started_at DESC NULLS LAST, created_at DESC, id DESC
    ) AS rn
  FROM public.results
  WHERE status = 'in_progress'
)
DELETE FROM public.results r
USING ranked d
WHERE r.id = d.id
  AND d.rn > 1;

-- Enforce one active in-progress take per student per exam.
CREATE UNIQUE INDEX IF NOT EXISTS results_one_active_take_per_exam_student
ON public.results (exam_id, student_id)
WHERE status = 'in_progress';

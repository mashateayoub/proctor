-- 1. Create enum for take status
DO $$ BEGIN
    CREATE TYPE take_status AS ENUM ('in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Refactor results table to support "Exam Take" lifecycle
ALTER TABLE public.results 
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status take_status DEFAULT 'in_progress';

-- 3. Update existing results to 'completed' (legacy data)
UPDATE public.results SET status = 'completed' WHERE status IS NULL;

-- 4. Make result_id MANDATORY in cheating_logs to enforce strict association
-- Note: We first need to ensure all existing logs have a result_id or handle orphans.
-- For this refactor, we'll allow NULL for legacy logs but require it for new ones via app logic,
-- or we can enforce it if we're sure. Let's make it mandatory for integrity.
ALTER TABLE public.cheating_logs 
  ALTER COLUMN result_id SET NOT NULL;

-- 5. Update RLS policies to allow students to UPDATE their own in_progress results
-- (They need to update mcq_score and status when finishing)
DROP POLICY IF EXISTS "results_update_student" ON public.results;
CREATE POLICY "results_update_student" 
ON public.results 
FOR UPDATE 
TO authenticated 
USING (student_id = auth.uid() AND status = 'in_progress')
WITH CHECK (student_id = auth.uid());

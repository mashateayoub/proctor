-- HOTFIX: Allow students to SELECT their own results rows immediately after insertion.
-- This is required because the app uses .insert().select('id').single()
-- which fails if the user doesn't have SELECT permission on the newly created row.

DROP POLICY IF EXISTS "results_read_student" ON public.results;

CREATE POLICY "results_select_student" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (student_id = auth.uid());

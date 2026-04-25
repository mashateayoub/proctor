-- HOTFIX: Give students permission to SELECT and UPDATE their own active cheating_logs session during an exam
-- Without this, ProctorCamera.tsx will suffer silent failures trying to append anomalies!

DROP POLICY IF EXISTS "cheating_logs_select_student" ON public.cheating_logs;
DROP POLICY IF EXISTS "cheating_logs_update_student" ON public.cheating_logs;

CREATE POLICY "cheating_logs_select_student" 
ON public.cheating_logs 
FOR SELECT 
TO authenticated 
USING (student_id = auth.uid());

CREATE POLICY "cheating_logs_update_student" 
ON public.cheating_logs 
FOR UPDATE 
TO authenticated 
USING (student_id = auth.uid());

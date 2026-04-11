-- Add pin_code to the exams table, making it UNIQUE so no two exams share a pin
ALTER TABLE public.exams ADD COLUMN pin_code TEXT UNIQUE;

-- Update the RLS policy so students can still select if they provide the exact pin
-- (For Option A, they query where pin_code = 'XYZ123', so the existing "exams_read_all" policy is actually fine since it permits SELECT, but the app logic will handle the strict filtering by pin_code).
-- However, if we wanted to enforce it strictly at the DB level:
-- DROP POLICY "exams_read_all" ON public.exams;
-- CREATE POLICY "exams_read_pin" ON public.exams FOR SELECT TO public USING (true); 
-- (Kept true for now because they need to be able to verify pins. We will handle pin verification logic via the Supabase Client matcher).

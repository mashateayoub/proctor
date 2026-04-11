-- Add teacher-managed coding grade to results table
-- Values: 'pending' (default), 'passed', 'failed'
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS coding_grade TEXT DEFAULT 'pending';

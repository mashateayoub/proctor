-- Add test_cases JSONB column to coding_questions
-- Each element: { "input": "stdin data", "expectedOutput": "expected stdout", "label": "Test name" }
ALTER TABLE public.coding_questions
  ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb;

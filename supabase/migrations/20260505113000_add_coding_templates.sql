-- Add LeetCode-style starter template metadata for coding questions
ALTER TABLE public.coding_questions
ADD COLUMN IF NOT EXISTS template_function_name TEXT,
ADD COLUMN IF NOT EXISTS starter_templates JSONB DEFAULT '{}'::jsonb;


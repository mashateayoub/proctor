ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS environment_mode TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS vm_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS execution_policy JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exams_environment_mode_check'
  ) THEN
    ALTER TABLE public.exams
    ADD CONSTRAINT exams_environment_mode_check
    CHECK (environment_mode IN ('standard', 'terminal_lab', 'hybrid'));
  END IF;
END $$;

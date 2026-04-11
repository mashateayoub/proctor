-- Full ProctoAI-MERN equivalent schema

-- Create enum for user roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Expose to anon and auth (registration logic might need direct insert, or we handle via trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'::user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. exams table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  live_date TIMESTAMPTZ NOT NULL,
  dead_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 3. questions (MCQ)
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of { "optionText": "...", "isCorrect": true/false }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 4. coding_questions
CREATE TABLE IF NOT EXISTS public.coding_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.coding_questions ENABLE ROW LEVEL SECURITY;

-- 5. results
CREATE TABLE IF NOT EXISTS public.results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  mcq_score FLOAT NOT NULL,
  coding_submissions JSONB, -- Array of { "code": "...", "language": "...", "executionTime": float, "success": boolean }
  show_to_student BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- 6. cheating_logs (New replacement for cheat_events)
CREATE TABLE IF NOT EXISTS public.cheating_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  no_face_count INTEGER DEFAULT 0,
  multiple_face_count INTEGER DEFAULT 0,
  cell_phone_count INTEGER DEFAULT 0,
  prohibited_object_count INTEGER DEFAULT 0,
  screenshots JSONB DEFAULT '[]'::jsonb, -- Array of { "url": "...", "type": "...", "detectedAt": "timestamp" }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.cheating_logs ENABLE ROW LEVEL SECURITY;

-- Drop previous conflicting policies if any for cleaner idempotence (optional but good practice)

-- RLS Policies
CREATE POLICY "users_read_all" ON public.users FOR SELECT TO authenticated USING (true);

-- Exams
CREATE POLICY "exams_read_all" ON public.exams FOR SELECT TO public USING (true);
CREATE POLICY "exams_insert_teacher" ON public.exams FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher'));
CREATE POLICY "exams_update_teacher" ON public.exams FOR UPDATE TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "exams_delete_teacher" ON public.exams FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- Questions
CREATE POLICY "questions_read_all" ON public.questions FOR SELECT TO public USING (true);
CREATE POLICY "questions_insert_teacher" ON public.questions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()));

-- Coding Questions
CREATE POLICY "coding_questions_read_all" ON public.coding_questions FOR SELECT TO public USING (true);
CREATE POLICY "coding_questions_insert_teacher" ON public.coding_questions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()));

-- Results
CREATE POLICY "results_read_student" ON public.results FOR SELECT TO authenticated USING (student_id = auth.uid() AND show_to_student = true);
CREATE POLICY "results_read_teacher" ON public.results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()));
CREATE POLICY "results_insert_student" ON public.results FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "results_update_teacher" ON public.results FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()));

-- Cheating Logs
CREATE POLICY "cheating_logs_read_teacher" ON public.cheating_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()));
CREATE POLICY "cheating_logs_insert_student" ON public.cheating_logs FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

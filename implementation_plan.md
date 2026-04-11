# Implementation Plan: Full-Featured AI Proctoring Platform

This detailed plan maps the capabilities of the "ProctoAI-MERN" example into our modern Next.js + Supabase + Tailwind stack. We will separate functionalities into distinct, highly featured Teacher and Student portals.

## 1. Database Schema (Supabase)

The core architecture requires the following tables to mimic the application exactly:

1. **`users`**
   - `id` (UUID, Matches Auth)
   - `email` (String)
   - `role` (Enum: `student`, `teacher`)
   - `name` (String)

2. **`exams`**
   - `id` (UUID, PK)
   - `teacher_id` (UUID, FK -> users)
   - `exam_name` (String)
   - `duration_minutes` (Integer)
   - `total_questions` (Integer)
   - `live_date` (Timestamp)
   - `dead_date` (Timestamp)
   
3. **`questions`** (MCQ)
   - `id` (UUID, PK)
   - `exam_id` (UUID, FK -> exams)
   - `question_text` (Text)
   - `options` (JSONB) - Array of `{ optionText: string, isCorrect: boolean }`

4. **`coding_questions`**
   - `id` (UUID, PK)
   - `exam_id` (UUID, FK -> exams)
   - `question_text` (Text)
   - `description` (Text)

5. **`results`** (Consolidated Submission Data)
   - `id` (UUID, PK)
   - `exam_id` (UUID, FK -> exams)
   - `student_id` (UUID, FK -> users)
   - `mcq_score` (Float)
   - `coding_submissions` (JSONB) - Array of `{ code: string, language: string, executionTime: float }`
   - `show_to_student` (Boolean, default `false`)
   - `created_at` (Timestamp)

6. **`cheating_logs`**
   - `id` (UUID, PK)
   - `exam_id` (UUID, FK -> exams)
   - `student_id` (UUID, FK -> users)
   - `no_face_count` (Integer)
   - `multiple_face_count` (Integer)
   - `cell_phone_count` (Integer)
   - `prohibited_object_count` (Integer)
   - `screenshots` (JSONB) - Array of `{ url: string, type: violation_type, detectedAt: timestamp }`

---

## 2. Authentication and App Routing

- **Supabase Auth**: Handle Registration (Name, Email, Password, Role Dropdown) and Login.
- **Middleware**: Inspect the user role from Supabase session. Redirect `/student/*` hits to `/teacher/dashboard` if role is teacher, and vice-versa. Unauthenticated traffic goes to `/auth/login`.

---

## 3. Teacher Portal Experience

### Create Exam (`/teacher/create-exam`)
- Multi-step form built with Formik equivalent.
- Captures `examName`, `duration`, `liveDate`, `deadDate`.
- Directly attaches a primary `coding_question` (prompt & description).

### Add Questions Form (`/teacher/add-questions`)
- Select Exam dropdown.
- Add MCQ text, with up to 4 inputs for options, and checkboxes to flag which is the correct string.
- Action to "Submit Questions" attaches them all to the selected exam.

### Cheating Logs Viewer (`/teacher/exam-log`)
- Filterable table based off the `cheating_logs` table.
- Table columns: Name, Email, No Face Count, Multiple Face, Cell Phone, Prohibited Object.
- Violation Counters use colored badges (Warning vs Danger based on severity/count).
- Clicking the image icon opens a Modal rendering all associated snapshot URLs with their timestamps and violation types. 

### Results Viewer (`/teacher/results`)
- Aggregate view of all student submissions.
- Filter by Exam ID or Student Name.
- View MCQ Score (%) and full code submissions in a code highlighter modal.
- Includes a toggle button to make the Result visible to the Student's portal.

---

## 4. Student Portal Experience

### Active Exams Timeline (`/student/dashboard`)
- Only displays exams where `current_date` is between `live_date` and `dead_date`.

### Testing Pipeline
1. **Exam Details View**: Shows instructions, forces a checkbox labeled "I certify that I have carefully read...", which enables the "Start Test" button.
2. **MCQ Interface (`/student/test/:id`)**:
   - Sticky top bar with MM:SS countdown timer.
   - Paginator to jump between questions.
   - Webcam component explicitly mounted in an aside/corner wrapper.
   - Saves answers locally until timer finishes or "Finish" is clicked, routing to the Coding interface.
3. **Coding Interface (`/student/coder/:id`)**:
   - Sidebar maintains webcam component.
   - Dropdown switches between JS / Python / Java.
   - Integrates Monaco editor (`@monaco-editor/react`) for full syntax support.
   - "Run Code" executes API and prints stdout to the bottom terminal pane.
   - "Submit Test" dispatches all remaining code to the DB, fires the final `cheating_logs` mutation mapping everything captured, and directs to Success screen.

---

## 5. E2E Proctoring Implementation

The core logic resides in a background tracking context (e.g., `WebCam.tsx` behavior from the example).

1. **Object Detection**: Run our local [useMediaPipe](file:///d:/Projects/ai-proctor/src/hooks/useMediaPipe.ts#94-420) setup continuously querying frames.
2. **Violation Handlers**: If AI returns `face not visible`, `person_count > 1`, `cell phone`, etc.
3. **Debouncer**: Avoid spamming variables by ensuring minimum 3000ms between matching events.
4. **Snapshot Upload**: Upon violation, draw the video `<canvas>`, output `.toDataURL('image/jpeg')`, upload to a Supabase bucket, and append the Public URL object to local state `cheatingLog.screenshots`.
5. **Real-time Alerting**: The user sees a `swal` (SweetAlert) pop up warning them immediately ("Warning Recorded: Cell Phone Detected!").
6. **Final Persistence**: The final `cheatingLog` object is injected into the DB *only* upon final Test Submission.

---

## 6. Real-Time Code Execution Server

We will construct internal API App Router endpoints to handle dynamic code execution safely (porting over the existing `child_process` examples):

- `/api/run/javascript`: Executes `node -e '<code>'`
- `/api/run/python`: Executes `python -c '<code>'`
- `/api/run/java`: Writes a `Main.java` inside `/tmp`, runs `javac` and `java`, and removes it post-execution.
*(Note: Appropriate timeouts will be used (`exec({ timeout: 5000 })`) to prevent infinite `while(true)` loops crashing the server.)*

## Verification Plan
**Automated**: Manual testing is required for browser constraints, but we can Unit Test PostgreSQL/Supabase Row Level Policies using curl configurations.
**Manual**: E2E User Creation -> Teacher Exam Creation -> Student Exam Execution -> Server code execution test -> Proctor violation simulation -> Teacher Dashboard artifact review.

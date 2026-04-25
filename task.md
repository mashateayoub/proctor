# Full-Featured AI Proctoring Platform Tasks

## Phase 1: Database & Authentication Structure
-[x] Implement Supabase `users` table & sync logic (Role-based: student/teacher)
-[x] Create Supabase schema for `exams` (Metadata, live Date, dead Date, duration)
-[x] Create Supabase schema for `questions` & `coding_questions` (Options, correct answers, language support)
-[x] Create Supabase schema for `exam_attempts` & `responses` (MCQ choices, Coding submissions)
-[x] Refactor Supabase schema for `cheating_logs` (username, exam_id, violation counts: noFace, multipleFace, cellPhone, prohibitedObject, and screenshots array)
-[x] Create Role-based Next.js Middleware (Protect `/student` and `/teacher` routes)
-[x] Setup Auth UI for Login / Registration with Role Selection
-[x] Add Unit & Integration tests for Auth & DB schema/logic

## Phase 2: Teacher Portal Implementation
-[/] Develop Teacher Dashboard UI with top-level statistics summary
-[/] Build **Create Exam Form** (Exam Name, Total Questions, Duration, Live/Dead Dates, Initial Coding question)
-[/] Build **Add MCQ Questions Component** (Dynamic option fields, correctness toggles, dropdown to select target exam)
-[/] Build **Exam Management Layout** (List active exams, Delete exam functionality)
-[/] Build **Exam Log/Cheating Dashboard**
    -[/] Create Table to list logged students (Filter by Name/Email, Select Exam)
    -[/] Display colored chips for violation counts based on severity
    -[/] Create Screenshot Modal to view uploaded cheating snapshots
-[/] Build **Results Dashboard**
    -[/] View list of all student submissions, MCQ computed scores, Total sums
    -[/] Add Action to "Toggle Visibility of Result to Student"
    -[/] Create Modal to view student's raw code submissions with Syntax Highlighting

## Phase 3: Student Portal Implementation
- [ ] Develop Student Dashboard UI to list Available and Active Exams
- [ ] Build **Exam Instructions Page** (Information, Rules, "I Certify" checkbox, Start Button)
- [ ] Build **Active Test Page (MCQ)** 
    - [ ] Implement Sticky Countdown Timer with Auto-Submit at `00:00`
    - [ ] Implement Question selection and pagination
    - [ ] Render `WebCam` Proctoring component seamlessly in the corner
- [ ] Build **Coding Test Page** 
    - [ ] Integrate `@monaco-editor/react` (Theme VS-Dark, configurable font/layout)
    - [ ] Implement Language Selector dropdown (JavaScript, Python, Java)
    - [ ] Create "Run Code" Output panel (Fetch results from execution API)
    - [ ] Build specific "Submit Code Test" action payload constructor
- [ ] Build **Student Results Page** (View past completions, specific MCQ scores, view their successful code submissions if Teacher allowed visibility)

## Phase 4: Code Execution Engine (Backend)
- [ ] Build Serverless or Server-Action Endpoint `/api/run-javascript` 
- [ ] Build Serverless or Server-Action Endpoint `/api/run-python`
- [ ] Build Serverless or Server-Action Endpoint `/api/run-java`
- [ ] **Important**: Implement safety logic (e.g. `child_process.exec` with timeouts, isolated temporary file generation and deletion loops)

## Phase 5: Silent Proctoring Engine (`WebCam.jsx` / `useMediaPipe.ts`)
- [ ] Integrate TensorFlow.js / coco-ssd object detection OR keep updated MediaPipe setup for broader object tracking
- [ ] Implement violation debouncing (e.g. 3-second cooldown per tracking event)
- [ ] Implement logic to increment specific violation counters (`noFaceCount`, `multipleFaceCount`, `cellPhoneCount`, `prohibitedObjectCount`)
- [ ] Build silent Canvas Snapshot system (capture video frame on violation to `image/jpeg` base64)
- [ ] Implement logic to upload snapshots to Supabase Storage and fetch public URL
- [ ] Create mutation trigger to silently push comprehensive cheating log JSON to database upon test submission
- [ ] Display browser native `alert` or `swal` warnings on student side upon detection

## Phase 6: E2E Verification
- [ ] Complete E2E flow: Teacher creates Exam -> Adds questions -> Student takes exam -> Triggers violations -> Submits -> Teacher views screenshots & Code

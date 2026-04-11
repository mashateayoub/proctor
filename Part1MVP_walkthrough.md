# AI Proctoring Service MVP — Walkthrough

## What Was Built

A real-time, browser-based AI proctoring system that monitors exam-takers via webcam using a two-tier detection pipeline:

1. **Edge AI (MediaPipe)** — runs in the browser, analyzes every video frame for head pose deviation, phone presence, and multiple persons
2. **Cloud AI (Gemini 1.5 Flash)** — verifies flagged snapshots server-side, then logs to Supabase and sends email alerts via Resend

## Files Created

| File | Purpose |
|---|---|
| [001_initial_schema.sql](file:///d:/Projects/ai-proctor/supabase/migrations/001_initial_schema.sql) | Supabase schema: 2 tables, index, RLS |
| [.env.local.example](file:///d:/Projects/ai-proctor/.env.local.example) | 6 env vars documented |
| [supabaseClient.ts](file:///d:/Projects/ai-proctor/src/lib/supabaseClient.ts) | Browser Supabase singleton |
| [supabaseServer.ts](file:///d:/Projects/ai-proctor/src/lib/supabaseServer.ts) | Server Action Supabase factory |
| [useMediaPipe.ts](file:///d:/Projects/ai-proctor/src/hooks/useMediaPipe.ts) | FaceLandmarker + ObjectDetector hook |
| [verifyCheatEvent.ts](file:///d:/Projects/ai-proctor/src/actions/verifyCheatEvent.ts) | Server Action: Gemini → Supabase → Resend |
| [ProctorCamera.tsx](file:///d:/Projects/ai-proctor/src/components/ProctorCamera.tsx) | Main UI: form → proctoring → summary |
| [page.tsx](file:///d:/Projects/ai-proctor/src/app/page.tsx) | Root page with header + version badge |

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run dev` | ✅ Ready in 340ms on localhost:3000 |

---

## Setup Guide

### 1. Project Already Scaffolded

The project is at `d:\Projects\ai-proctor` with all dependencies installed. If starting fresh:

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --no-import-alias
npm install @mediapipe/tasks-vision @google/generative-ai @supabase/supabase-js @supabase/ssr resend
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your **Project URL** and **anon public key**
3. Go to **SQL Editor** and run the contents of [supabase/migrations/001_initial_schema.sql](file:///d:/Projects/ai-proctor/supabase/migrations/001_initial_schema.sql)
4. *(Optional)* Create a Storage bucket named `snapshots` with public access for Phase 2

### 3. Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Create API Key** → copy it
3. This key is server-only — never expose it to the browser

### 4. Resend Setup

1. Create an account at [resend.com](https://resend.com)
2. **Settings → API Keys** → Create a new key
3. **Domains** → Add and verify your sending domain (DNS records)
4. For testing, you can use `onboarding@resend.dev` as `RESEND_FROM_EMAIL`

### 5. Environment Variables

Copy the template and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
GEMINI_API_KEY=AIza...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=proctor@yourdomain.com
ADMIN_ALERT_EMAIL=admin@yourdomain.com
```

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → fill the pre-exam form → grant webcam access → proctoring begins.

-- =============================================================================
-- AI Proctoring Service — Initial Database Schema
-- Migration: 20260405000000_initial_schema.sql
-- Description: Creates core tables for proctoring sessions and cheat events,
--              along with MVP-phase RLS policies allowing anonymous access.
-- =============================================================================

-- gen_random_uuid() is built into PostgreSQL 13+ (used by Supabase)
-- No extension needed.

-- =============================================================================
-- TABLE: proctoring_sessions
-- Stores metadata about each exam proctoring session.
-- =============================================================================

-- Drop if partially created from a previous failed migration
DROP TABLE IF EXISTS cheat_events CASCADE;
DROP TABLE IF EXISTS proctoring_sessions CASCADE;

CREATE TABLE proctoring_sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name    text NOT NULL,
    student_email   text NOT NULL,
    exam_name       text NOT NULL,
    exam_duration   integer,                          -- duration in minutes
    start_time      timestamptz DEFAULT now(),
    end_time        timestamptz,                      -- NULL until exam ends
    status          text DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'flagged', 'aborted')),
    violation_count integer DEFAULT 0,
    created_at      timestamptz DEFAULT now()
);

-- =============================================================================
-- TABLE: cheat_events
-- Logs individual cheating anomalies detected during a session.
-- Each event references the parent session and stores detection metadata.
-- =============================================================================
CREATE TABLE cheat_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid NOT NULL
                    REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
    type            text NOT NULL,                    -- 'eye_off_screen' | 'multiple_persons' | 'phone_detected' | 'audio_spike'
    source          text NOT NULL,                    -- 'mediapipe_edge' | 'gemini_cloud'
    confidence      float,                            -- 0.0 to 1.0
    gemini_reason   text,                             -- nullable: human-readable reason from Gemini
    snapshot_url    text,                             -- nullable: Supabase Storage public URL
    resolved        boolean DEFAULT false,
    timestamp       timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEX: Accelerate lookups of cheat events by session
-- =============================================================================
CREATE INDEX idx_cheat_events_session_id ON cheat_events(session_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — MVP Phase
-- WARNING: These policies are intentionally permissive for the MVP.
-- They allow anonymous (anon) role full INSERT/SELECT/UPDATE access.
-- Phase 2 (Spring Boot backend) MUST replace these with JWT-scoped policies.
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE proctoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheat_events ENABLE ROW LEVEL SECURITY;

-- proctoring_sessions: Allow anonymous INSERT (create new sessions)
CREATE POLICY anon_insert_sessions ON proctoring_sessions
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- proctoring_sessions: Allow anonymous SELECT (read session data)
CREATE POLICY anon_select_sessions ON proctoring_sessions
    FOR SELECT
    TO anon
    USING (true);

-- proctoring_sessions: Allow anonymous UPDATE (end exam, increment violation_count)
CREATE POLICY anon_update_sessions ON proctoring_sessions
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- cheat_events: Allow anonymous INSERT (log new events)
CREATE POLICY anon_insert_events ON cheat_events
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- cheat_events: Allow anonymous SELECT (read events for display)
CREATE POLICY anon_select_events ON cheat_events
    FOR SELECT
    TO anon
    USING (true);

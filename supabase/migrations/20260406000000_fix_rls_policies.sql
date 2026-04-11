-- =============================================================================
-- Fix RLS policies to allow both anon AND authenticated roles
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS anon_insert_sessions ON proctoring_sessions;
DROP POLICY IF EXISTS anon_select_sessions ON proctoring_sessions;
DROP POLICY IF EXISTS anon_update_sessions ON proctoring_sessions;
DROP POLICY IF EXISTS anon_insert_events ON cheat_events;
DROP POLICY IF EXISTS anon_select_events ON cheat_events;

-- Recreate with PUBLIC (covers anon + authenticated)
CREATE POLICY allow_insert_sessions ON proctoring_sessions
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY allow_select_sessions ON proctoring_sessions
    FOR SELECT TO public USING (true);

CREATE POLICY allow_update_sessions ON proctoring_sessions
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY allow_insert_events ON cheat_events
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY allow_select_events ON cheat_events
    FOR SELECT TO public USING (true);

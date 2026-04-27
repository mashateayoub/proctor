-- Private storage bucket for proctoring camera snapshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('proctoring-snapshots', 'proctoring-snapshots', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Allow authenticated clients to upload proctoring snapshot files
DROP POLICY IF EXISTS "proctoring_snapshots_insert_auth" ON storage.objects;
CREATE POLICY "proctoring_snapshots_insert_auth"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proctoring-snapshots');

-- Allow authenticated clients to read metadata / generate signed URLs
DROP POLICY IF EXISTS "proctoring_snapshots_select_auth" ON storage.objects;
CREATE POLICY "proctoring_snapshots_select_auth"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'proctoring-snapshots');

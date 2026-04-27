'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export const PROCTORING_SNAPSHOTS_BUCKET = 'proctoring-snapshots';

export type ProctoringSnapshot = {
  url: string;
  type: string;
  detectedAt: string;
  storagePath?: string;
  storageUrl?: string;
  storageMethod?: 'base64' | 'file+base64';
};

type CountIncrements = {
  noFace?: number;
  multipleFace?: number;
  cellPhone?: number;
  prohibitedObject?: number;
};

type PersistProctoringLogOptions = {
  examId: string;
  studentId: string;
  takeId: string;
  increments?: CountIncrements;
  screenshots?: ProctoringSnapshot[];
};

const zeroCounts = {
  noFace: 0,
  multipleFace: 0,
  cellPhone: 0,
  prohibitedObject: 0,
};

function isBase64ImageDataUrl(value: string) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function decodeBase64(data: string) {
  if (typeof atob === 'function') return atob(data);
  throw new Error('Base64 decoding is unavailable in this runtime.');
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, payload] = dataUrl.split(',');
  if (!meta || !payload) throw new Error('Malformed data URL.');
  const mimeMatch = meta.match(/^data:([^;]+);base64$/);
  if (!mimeMatch?.[1]) throw new Error('Unsupported data URL encoding.');

  const binary = decodeBase64(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return {
    blob: new Blob([bytes], { type: mimeMatch[1] }),
    contentType: mimeMatch[1],
  };
}

function makeSnapshotPath(examId: string, takeId: string, snapshot: ProctoringSnapshot) {
  const safeType = (snapshot.type || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const ts = new Date(snapshot.detectedAt || Date.now()).toISOString().replace(/[:.]/g, '-');
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return `${examId}/${takeId}/${ts}-${safeType}-${id}.jpg`;
}

async function uploadSnapshotWithRetry(
  supabase: SupabaseClient,
  path: string,
  blob: Blob,
  contentType: string,
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { error } = await supabase.storage
      .from(PROCTORING_SNAPSHOTS_BUCKET)
      .upload(path, blob, {
        contentType,
        upsert: false,
      });

    if (!error) return { ok: true as const };
    lastError = error;
  }

  return { ok: false as const, error: lastError };
}

async function attachStorageMetadata(
  supabase: SupabaseClient,
  examId: string,
  takeId: string,
  snapshots: ProctoringSnapshot[],
) {
  const enriched: ProctoringSnapshot[] = [];

  for (const snapshot of snapshots) {
    if (snapshot.storagePath) {
      enriched.push(snapshot);
      continue;
    }

    if (!snapshot.url || !isBase64ImageDataUrl(snapshot.url)) {
      enriched.push(snapshot);
      continue;
    }

    try {
      const { blob, contentType } = dataUrlToBlob(snapshot.url);
      const path = makeSnapshotPath(examId, takeId, snapshot);
      const upload = await uploadSnapshotWithRetry(supabase, path, blob, contentType);

      if (!upload.ok) {
        console.warn('[proctoring] Snapshot file upload failed after retry; keeping base64 only', upload.error);
        enriched.push({ ...snapshot, storageMethod: 'base64' });
        continue;
      }

      const { data: publicData } = supabase.storage.from(PROCTORING_SNAPSHOTS_BUCKET).getPublicUrl(path);
      enriched.push({
        ...snapshot,
        storagePath: path,
        storageUrl: publicData.publicUrl,
        storageMethod: 'file+base64',
      });
    } catch (error) {
      console.warn('[proctoring] Snapshot file processing failed; keeping base64 only', error);
      enriched.push({ ...snapshot, storageMethod: 'base64' });
    }
  }

  return enriched;
}

export async function persistProctoringLog(
  supabase: SupabaseClient,
  {
    examId,
    studentId,
    takeId,
    increments = zeroCounts,
    screenshots = [],
  }: PersistProctoringLogOptions,
) {
  if (!takeId) {
    const err = new Error('takeId (Take ID) is mandatory for proctoring logs.');
    console.error('[proctoring]', err);
    return { error: err };
  }

  const counts = { ...zeroCounts, ...increments };
  const enrichedScreenshots = await attachStorageMetadata(supabase, examId, takeId, screenshots);

  // Strict mapping: One take (takeId) has one cheating_log row
  const { data: existing, error: fetchError } = await supabase
    .from('cheating_logs')
    .select('*')
    .eq('result_id', takeId)
    .maybeSingle();

  if (fetchError) {
    console.error('[proctoring] Failed to read cheating log', fetchError);
    return { error: fetchError };
  }

  if (existing) {
    const { data, error } = await supabase
      .from('cheating_logs')
      .update({
        no_face_count: (existing.no_face_count || 0) + counts.noFace,
        multiple_face_count: (existing.multiple_face_count || 0) + counts.multipleFace,
        cell_phone_count: (existing.cell_phone_count || 0) + counts.cellPhone,
        prohibited_object_count: (existing.prohibited_object_count || 0) + counts.prohibitedObject,
        screenshots: [...(existing.screenshots || []), ...enrichedScreenshots],
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      console.error('[proctoring] Failed to update cheating log', error);
      return { error };
    }

    return { data };
  }

  const { data, error } = await supabase
    .from('cheating_logs')
    .insert({
      result_id: takeId,
      exam_id: examId,
      student_id: studentId,
      no_face_count: counts.noFace,
      multiple_face_count: counts.multipleFace,
      cell_phone_count: counts.cellPhone,
      prohibited_object_count: counts.prohibitedObject,
      screenshots: enrichedScreenshots,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[proctoring] Failed to insert cheating log', error);
    return { error };
  }

  return { data };
}

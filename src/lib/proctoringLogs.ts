'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export type ProctoringSnapshot = {
  url: string;
  type: string;
  detectedAt: string;
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

type ProctoringLogRow = {
  id: string;
  result_id: string | null;
  no_face_count: number | null;
  multiple_face_count: number | null;
  cell_phone_count: number | null;
  prohibited_object_count: number | null;
  screenshots: ProctoringSnapshot[] | null;
};

const zeroCounts = {
  noFace: 0,
  multipleFace: 0,
  cellPhone: 0,
  prohibitedObject: 0,
};

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
        screenshots: [...(existing.screenshots || []), ...screenshots],
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
      screenshots,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[proctoring] Failed to insert cheating log', error);
    return { error };
  }

  return { data };
}

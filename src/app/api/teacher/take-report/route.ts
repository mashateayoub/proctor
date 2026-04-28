import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { FetchTakeReportResponse, TakeReportRiskLevel } from '@/types/takeReport';

const PROMPT_VERSION = 'v1';

interface ParsedReport {
  report_text: string;
  risk_level: TakeReportRiskLevel;
  key_flags: string[];
}

function safeRiskLevel(value: string | null | undefined): TakeReportRiskLevel {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

function buildPrompt(payload: {
  examName: string;
  studentName: string;
  takeStatus: string;
  startedAt: string | null;
  endedAt: string;
  mcqScore: number;
  codingGrade: string | null;
  codingSubmissions: unknown;
  anomalyCounts: {
    no_face_count: number;
    multiple_face_count: number;
    cell_phone_count: number;
    prohibited_object_count: number;
  };
}) {
  return `You are an exam integrity analyst. Generate a concise professional take report using only supplied facts.
Return strict JSON with this exact shape:
{
  "report_text": "string, 90-180 words",
  "risk_level": "low|medium|high",
  "key_flags": ["string", "string"]
}
Rules:
- Do not invent missing facts.
- Mention both performance and integrity signals.
- If anomalies total is 0, explicitly mark integrity as clean.
- Keep tone factual, no legal conclusions.

DATA:
${JSON.stringify(payload, null, 2)}`;
}

function normalizeReport(raw: unknown): ParsedReport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI response payload.');
  }
  const value = raw as {
    report_text?: unknown;
    risk_level?: unknown;
    key_flags?: unknown;
  };
  const reportText =
    typeof value.report_text === 'string' && value.report_text.trim()
      ? value.report_text.trim()
      : 'AI report could not be generated with enough confidence. Please regenerate.';
  const riskLevel = safeRiskLevel(typeof value.risk_level === 'string' ? value.risk_level.toLowerCase() : null);
  const keyFlags = Array.isArray(value.key_flags)
    ? value.key_flags.filter((flag): flag is string => typeof flag === 'string' && flag.trim().length > 0).slice(0, 8)
    : [];

  return {
    report_text: reportText,
    risk_level: riskLevel,
    key_flags: keyFlags,
  };
}

function extractJsonPayload(text: string) {
  const normalized = text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return normalized;
}

function toResponse(report: {
  result_id: string;
  report_text: string;
  risk_level: string;
  key_flags: unknown;
  model: string;
  prompt_version: string;
  generated_at: string;
}): FetchTakeReportResponse {
  return {
    cached: true,
    report: {
      resultId: report.result_id,
      reportText: report.report_text,
      riskLevel: safeRiskLevel(report.risk_level),
      keyFlags: Array.isArray(report.key_flags) ? report.key_flags.filter((flag): flag is string => typeof flag === 'string') : [],
      model: report.model,
      promptVersion: report.prompt_version,
      generatedAt: report.generated_at,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { resultId?: string; force?: boolean };
    const resultId = body.resultId?.trim();
    const force = Boolean(body.force);

    if (!resultId) {
      return NextResponse.json({ error: 'Missing resultId.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: resultRow, error: resultError } = await supabase
      .from('results')
      .select(`
        id, exam_id, student_id, mcq_score, coding_grade, coding_submissions, status, started_at, created_at,
        exams ( exam_name, teacher_id ),
        users ( name ),
        cheating_logs ( no_face_count, multiple_face_count, cell_phone_count, prohibited_object_count )
      `)
      .eq('id', resultId)
      .single();

    if (resultError || !resultRow) {
      return NextResponse.json({ error: 'Take not found.' }, { status: 404 });
    }

    const examMeta = Array.isArray(resultRow.exams) ? resultRow.exams[0] : resultRow.exams;
    if (!examMeta || examMeta.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (!force) {
      const { data: cached } = await supabase
        .from('take_ai_reports')
        .select('result_id, report_text, risk_level, key_flags, model, prompt_version, generated_at')
        .eq('result_id', resultId)
        .maybeSingle();

      if (cached) {
        return NextResponse.json(toResponse(cached));
      }
    }

    const log = Array.isArray(resultRow.cheating_logs) ? resultRow.cheating_logs[0] : resultRow.cheating_logs;
    const anomalyCounts = {
      no_face_count: log?.no_face_count || 0,
      multiple_face_count: log?.multiple_face_count || 0,
      cell_phone_count: log?.cell_phone_count || 0,
      prohibited_object_count: log?.prohibited_object_count || 0,
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const userMeta = Array.isArray((resultRow as { users?: unknown }).users)
      ? ((resultRow as { users?: Array<{ name?: string | null }> }).users?.[0] ?? null)
      : ((resultRow as { users?: { name?: string | null } | null }).users ?? null);
    const prompt = buildPrompt({
      examName: examMeta.exam_name || 'Unknown Exam',
      studentName: userMeta?.name || 'Unknown Student',
      takeStatus: resultRow.status || 'unknown',
      startedAt: resultRow.started_at,
      endedAt: resultRow.created_at,
      mcqScore: Number(resultRow.mcq_score || 0),
      codingGrade: resultRow.coding_grade,
      codingSubmissions: resultRow.coding_submissions || [],
      anomalyCounts,
    });

    const generation = await model.generateContent(prompt);
    const text = generation.response.text();
    const parsed = normalizeReport(JSON.parse(extractJsonPayload(text)));

    const payload = {
      result_id: resultRow.id,
      exam_id: resultRow.exam_id,
      student_id: resultRow.student_id,
      report_text: parsed.report_text,
      risk_level: parsed.risk_level,
      key_flags: parsed.key_flags,
      model: modelName,
      prompt_version: PROMPT_VERSION,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertError } = await supabase
      .from('take_ai_reports')
      .upsert(payload, { onConflict: 'result_id' })
      .select('result_id, report_text, risk_level, key_flags, model, prompt_version, generated_at')
      .single();

    if (upsertError || !upserted) {
      return NextResponse.json({ error: 'Failed to save AI report.' }, { status: 500 });
    }

    const response: FetchTakeReportResponse = {
      cached: false,
      report: {
        resultId: upserted.result_id,
        reportText: upserted.report_text,
        riskLevel: safeRiskLevel(upserted.risk_level),
        keyFlags: Array.isArray(upserted.key_flags)
          ? upserted.key_flags.filter((flag): flag is string => typeof flag === 'string')
          : [],
        model: upserted.model,
        promptVersion: upserted.prompt_version,
        generatedAt: upserted.generated_at,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate report.' }, { status: 500 });
  }
}

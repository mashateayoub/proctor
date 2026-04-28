import type { FetchTakeReportResponse } from '@/types/takeReport';

export async function fetchOrGenerateTakeReport(resultId: string, force = false): Promise<FetchTakeReportResponse> {
  const response = await fetch('/api/teacher/take-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultId, force }),
  });

  const payload = (await response.json()) as FetchTakeReportResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch AI report.');
  }
  return payload;
}

export type TakeReportRiskLevel = 'low' | 'medium' | 'high';

export interface TakeAiReport {
  resultId: string;
  reportText: string;
  riskLevel: TakeReportRiskLevel;
  keyFlags: string[];
  model: string;
  promptVersion: string;
  generatedAt: string;
}

export interface TakeDrawerDetails {
  takeIdShort: string;
  status: 'in_progress' | 'completed';
  startedAtLabel: string;
  endedAtLabel: string;
  durationLabel: string;
  mcqScore: number;
  codingLabel: string;
  anomalyTotal: number;
  noFaceCount: number;
  multipleFaceCount: number;
  cellPhoneCount: number;
  prohibitedObjectCount: number;
  visibilityLabel: 'Published' | 'Hidden';
}

export interface TakeDrawerSnapshot {
  id: string;
  type: string;
  detectedAt: string;
  imageUrl: string | null;
  isBrowserEvent: boolean;
}

export interface FetchTakeReportResponse {
  report: TakeAiReport;
  cached: boolean;
}

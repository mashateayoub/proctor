'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { TableSearchInput } from '@/components/ui/TableSearchInput';
import { TableFilterChips } from '@/components/ui/TableFilterChips';
import { TakeReportDrawer } from '@/components/ui/TakeReportDrawer';
import { useToast } from '@/components/ui/ToastProvider';
import { useTableFilters } from '@/hooks/useTableFilters';
import { PROCTORING_SNAPSHOTS_BUCKET } from '@/lib/proctoringLogs';
import { fetchOrGenerateTakeReport } from '@/lib/takeReports';
import { fadeUp, scaleIn, overlayVariants, modalVariants, tableRowVariant } from '@/lib/motion';
import { normalizeErrorMessage } from '@/lib/errors';
import type { TakeAiReport, TakeDrawerDetails, TakeDrawerSnapshot } from '@/types/takeReport';

type TakeStatus = 'in_progress' | 'completed';
type CodingGrade = 'passed' | 'failed' | 'pending';
type CodeInspectorTab = 'overview' | 'tests' | 'source';
type TestResultFilter = 'all' | 'failed' | 'passed';

interface CodeTestResult {
  passed: boolean;
  label: string;
  expected: string;
  actual?: string;
}

interface CodingSubmission {
  code: string;
  language: string;
  executionTime: number;
  testResults?: CodeTestResult[];
  passedCount?: number;
  totalCount?: number;
}

interface CheatingLogSummary {
  no_face_count: number | null;
  multiple_face_count: number | null;
  cell_phone_count: number | null;
  prohibited_object_count: number | null;
  screenshots?: Screenshot[] | null;
}

interface ResultRow {
  id: string;
  mcq_score: number;
  coding_submissions: CodingSubmission[] | null;
  coding_grade: CodingGrade | null;
  show_to_student: boolean;
  created_at: string;
  started_at: string | null;
  status: TakeStatus;
  exams: { exam_name: string } | null;
  users: { name: string; email: string } | null;
  cheating_logs: CheatingLogSummary[] | CheatingLogSummary | null;
}

interface SelectedCodeState {
  submissions: CodingSubmission[];
  resultId: string;
  currentGrade: CodingGrade;
  activeSubmissionIndex: number;
}

interface Screenshot {
  url: string;
  type: string;
  detectedAt: string;
  storagePath?: string;
  storageUrl?: string;
  storageMethod?: 'base64' | 'file+base64';
}

interface ActiveTakeReportState {
  resultId: string;
  studentName: string;
  examName: string;
  details: TakeDrawerDetails;
  screenshots: Screenshot[];
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return 'N/A';
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 'N/A';

  const durationInMinutes = Math.round((end - start) / 60000);
  if (durationInMinutes < 60) return `${durationInMinutes}m`;
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function getAnomalyCounts(logs: ResultRow['cheating_logs']) {
  const source = Array.isArray(logs) ? logs[0] : logs;
  const noFace = source?.no_face_count || 0;
  const multipleFaces = source?.multiple_face_count || 0;
  const cellPhone = source?.cell_phone_count || 0;
  const prohibitedObject = source?.prohibited_object_count || 0;

  return {
    noFace,
    multipleFaces,
    cellPhone,
    prohibitedObject,
    total: noFace + multipleFaces + cellPhone + prohibitedObject,
  };
}

function getAnomalyScreenshots(logs: ResultRow['cheating_logs']) {
  const source = Array.isArray(logs) ? logs[0] : logs;
  return source?.screenshots || [];
}

function isBrowserEvent(type: string) {
  return type.startsWith('browser_');
}

function formatEventType(type: string) {
  const normalized = type.replace(/^browser_/, '').replace(/_/g, ' ').trim();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRuntimeBadge(executionTime: number) {
  if (executionTime <= 0) return { label: 'No runtime', className: 'bg-slate-100 text-slate-700' };
  if (executionTime <= 250) return { label: 'Fast', className: 'bg-emerald-100 text-emerald-700' };
  if (executionTime <= 1000) return { label: 'Normal', className: 'bg-blue-100 text-blue-700' };
  return { label: 'Slow', className: 'bg-amber-100 text-amber-700' };
}

function getInspectorRationale(submission: CodingSubmission | null, grade: CodingGrade) {
  if (!submission) return 'No code submission payload found for this take.';
  const total = submission.totalCount || submission.testResults?.length || 0;
  const passed = submission.passedCount ?? submission.testResults?.filter((tr) => tr.passed).length ?? 0;
  const failed = Math.max(total - passed, 0);

  if (total === 0) {
    return grade === 'pending'
      ? 'No automated suite is attached. Use manual code review before final grading.'
      : 'Manual grading was applied without test-suite evidence.';
  }
  if (failed === 0) return 'All automated tests passed. Submission behavior aligns with expected outputs.';
  if (failed <= 2) return 'Most tests passed, but there are targeted mismatches worth review before final grade.';
  return 'Multiple test failures detected. Submission likely needs significant correction.';
}

function AnomalyIndicator({ counts }: { counts: ReturnType<typeof getAnomalyCounts> }) {
  if (counts.total === 0) {
    return <span className="text-[12px] font-semibold text-emerald-700">Clean</span>;
  }

  return (
    <div className="flex items-center gap-2 text-[11px] text-ash">
      <span className="font-semibold text-ink">{counts.total}</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {counts.noFace}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {counts.multipleFaces}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        {counts.cellPhone}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
        {counts.prohibitedObject}
      </span>
    </div>
  );
}

function getCodingLabel(result: ResultRow, gradeLabels: Record<CodingGrade, string>) {
  if (!result.coding_submissions || result.coding_submissions.length === 0) return 'No coding submission';
  return gradeLabels[result.coding_grade || 'pending'];
}

export default function ResultsPage() {
  const { showToast } = useToast();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<SelectedCodeState | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<CodeInspectorTab>('overview');
  const [activeTestFilter, setActiveTestFilter] = useState<TestResultFilter>('all');
  const [signedSnapshotUrls, setSignedSnapshotUrls] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TakeStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [heatFilter, setHeatFilter] = useState<'all' | 'clean' | 'flagged'>('all');
  const [activeTakeReport, setActiveTakeReport] = useState<ActiveTakeReportState | null>(null);
  const [takeReport, setTakeReport] = useState<TakeAiReport | null>(null);
  const [takeReportLoading, setTakeReportLoading] = useState(false);
  const [takeReportRegenerating, setTakeReportRegenerating] = useState(false);
  const [takeReportError, setTakeReportError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setPageError(null);
    const { data, error } = await supabase
      .from('results')
      .select(`
        id, mcq_score, coding_submissions, coding_grade, show_to_student, created_at, started_at, status,
        exams ( exam_name ),
        users ( name, email ),
        cheating_logs ( no_face_count, multiple_face_count, cell_phone_count, prohibited_object_count, screenshots )
      `)
      .order('started_at', { ascending: false });

    if (data && !error) {
      setResults(data as unknown as ResultRow[]);
    } else {
      console.error('Failed to load results', error);
      setResults([]);
      setPageError(normalizeErrorMessage(error, 'Failed to load results.'));
    }
    setLoading(false);
  };

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('results')
      .update({ show_to_student: !currentStatus })
      .eq('id', id);

    if (!error) {
      setResults(results.map((r) => (r.id === id ? { ...r, show_to_student: !currentStatus } : r)));
      showToast({
        variant: 'success',
        title: 'Visibility updated',
        message: !currentStatus ? 'Result has been published to the student.' : 'Result has been hidden.',
      });
    } else {
      showToast({
        variant: 'error',
        title: 'Update failed',
        message: normalizeErrorMessage(error, 'Failed to update visibility.'),
      });
    }
  };

  const setCodingGrade = async (resultId: string, grade: CodingGrade) => {
    const { error } = await supabase
      .from('results')
      .update({ coding_grade: grade })
      .eq('id', resultId);

    if (!error) {
      setResults(results.map((r) => (r.id === resultId ? { ...r, coding_grade: grade } : r)));
      if (selectedCode && selectedCode.resultId === resultId) {
        setSelectedCode({ ...selectedCode, currentGrade: grade });
      }
      showToast({
        variant: 'success',
        title: 'Grade updated',
        message: `Coding grade set to ${gradeLabels[grade]}.`,
      });
    } else {
      showToast({
        variant: 'error',
        title: 'Grade update failed',
        message: normalizeErrorMessage(error, 'Failed to update coding grade.'),
      });
    }
  };

  const openTakeReport = async (result: ResultRow) => {
    const counts = getAnomalyCounts(result.cheating_logs);
    const screenshots = getAnomalyScreenshots(result.cheating_logs);
    const endLabel = result.status === 'completed' ? formatDateTime(result.created_at) : 'In progress';
    const durationLabel =
      result.status === 'completed'
        ? formatDuration(result.started_at, result.created_at)
        : formatDuration(result.started_at, new Date().toISOString());

    setActiveTakeReport({
      resultId: result.id,
      studentName: result.users?.name || 'Unknown Student',
      examName: result.exams?.exam_name || 'Unknown Exam',
      details: {
        takeIdShort: result.id.slice(0, 8),
        status: result.status,
        startedAtLabel: formatDateTime(result.started_at || result.created_at),
        endedAtLabel: endLabel,
        durationLabel,
        mcqScore: Number(result.mcq_score || 0),
        codingLabel: getCodingLabel(result, gradeLabels),
        anomalyTotal: counts.total,
        noFaceCount: counts.noFace,
        multipleFaceCount: counts.multipleFaces,
        cellPhoneCount: counts.cellPhone,
        prohibitedObjectCount: counts.prohibitedObject,
        visibilityLabel: result.show_to_student ? 'Published' : 'Hidden',
      },
      screenshots,
    });
    setTakeReport(null);
    setTakeReportError(null);
    setTakeReportLoading(true);
    try {
      const response = await fetchOrGenerateTakeReport(result.id, false);
      setTakeReport(response.report);
    } catch (error) {
      setTakeReportError(normalizeErrorMessage(error, 'Failed to load AI report.'));
    } finally {
      setTakeReportLoading(false);
    }
  };

  const regenerateTakeReport = async () => {
    if (!activeTakeReport) return;
    setTakeReportError(null);
    setTakeReportRegenerating(true);
    try {
      const response = await fetchOrGenerateTakeReport(activeTakeReport.resultId, true);
      setTakeReport(response.report);
      showToast({
        variant: 'success',
        title: 'AI report refreshed',
        message: 'A new report summary was generated for this take.',
      });
    } catch (error) {
      setTakeReportError(normalizeErrorMessage(error, 'Failed to regenerate AI report.'));
    } finally {
      setTakeReportRegenerating(false);
    }
  };

  const gradeColors: Record<CodingGrade, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    passed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  const gradeLabels: Record<CodingGrade, string> = {
    pending: 'Pending Review',
    passed: 'Passed',
    failed: 'Failed',
  };

  const filteredResults = useTableFilters({
    rows: results,
    query,
    filters: {
      status: statusFilter,
      visibility: visibilityFilter,
      heat: heatFilter,
    },
    searchText: (result) =>
      [
        result.users?.name || '',
        result.users?.email || '',
        result.exams?.exam_name || '',
        result.id,
        result.id.slice(0, 8),
      ].join(' '),
    filterPredicates: {
      status: (result, value) => result.status === value,
      visibility: (result, value) => (value === 'published' ? result.show_to_student : !result.show_to_student),
      heat: (result, value) => {
        const totalHeat = getAnomalyCounts(result.cheating_logs).total;
        return value === 'clean' ? totalHeat === 0 : totalHeat > 0;
      },
    },
  });

  useEffect(() => {
    let cancelled = false;

    const resolveSignedUrls = async () => {
      if (!activeTakeReport?.screenshots || activeTakeReport.screenshots.length === 0) {
        setSignedSnapshotUrls({});
        return;
      }

      const storagePaths = Array.from(
        new Set(
          activeTakeReport.screenshots
            .map((snapshot) => snapshot.storagePath)
            .filter((path): path is string => Boolean(path)),
        ),
      );

      if (storagePaths.length === 0) {
        setSignedSnapshotUrls({});
        return;
      }

      const urlMap: Record<string, string> = {};
      await Promise.all(
        storagePaths.map(async (path) => {
          const { data, error } = await supabase.storage
            .from(PROCTORING_SNAPSHOTS_BUCKET)
            .createSignedUrl(path, 60 * 60);
          if (!error && data?.signedUrl) {
            urlMap[path] = data.signedUrl;
          }
        }),
      );

      if (!cancelled) {
        setSignedSnapshotUrls(urlMap);
      }
    };

    resolveSignedUrls();

    return () => {
      cancelled = true;
    };
  }, [activeTakeReport, supabase]);

  const resolveSnapshotImageUrl = (snapshot: Screenshot) => {
    if (snapshot.storagePath && signedSnapshotUrls[snapshot.storagePath]) {
      return signedSnapshotUrls[snapshot.storagePath];
    }
    return snapshot.url;
  };

  const drawerSnapshots: TakeDrawerSnapshot[] = (activeTakeReport?.screenshots || []).map((snapshot, index) => ({
    id: `${snapshot.detectedAt}-${snapshot.type}-${index}`,
    type: snapshot.type,
    detectedAt: snapshot.detectedAt,
    imageUrl: isBrowserEvent(snapshot.type) ? null : resolveSnapshotImageUrl(snapshot),
    isBrowserEvent: isBrowserEvent(snapshot.type),
  }));

  const activeSubmission = selectedCode
    ? selectedCode.submissions[selectedCode.activeSubmissionIndex] || null
    : null;
  const activeTestResults = activeSubmission?.testResults || [];
  const passedCount =
    activeSubmission?.passedCount ?? activeTestResults.filter((result) => result.passed).length;
  const totalCount = activeSubmission?.totalCount ?? activeTestResults.length;
  const failedCount = Math.max(totalCount - passedCount, 0);
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : null;
  const runtimeBadge = getRuntimeBadge(activeSubmission?.executionTime || 0);
  const inspectorRationale = getInspectorRationale(activeSubmission, selectedCode?.currentGrade || 'pending');
  const filteredTestResults = activeTestResults
    .slice()
    .sort((a, b) => Number(a.passed) - Number(b.passed))
    .filter((result) => {
      if (activeTestFilter === 'failed') return !result.passed;
      if (activeTestFilter === 'passed') return result.passed;
      return true;
    });

  return (
    <>
      <div className="w-full">
        <div className="mx-auto max-w-[1360px]">
          <motion.div {...fadeUp} className="mb-10">
            <h1 className="mb-2 text-section-heading tracking-tight text-ink">Results & Proctoring Intelligence.</h1>
            <p className="max-w-[700px] text-body-standard text-ash">
              Review every take in one compact console: grading, integrity heat, and violation snapshots.
            </p>
          </motion.div>
          <div className="mb-4">
            <FeedbackBanner message={pageError} variant="error" />
          </div>

          <motion.div {...scaleIn} transition={{ ...scaleIn.transition, delay: 0.1 }}>
            <Card elevated className="overflow-hidden bg-white">
              <TableToolbar>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <TableSearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Search by student, email, exam, or take id..."
                  />
                  <span className="text-[12px] font-medium text-ash">
                    Showing {filteredResults.length} of {results.length} takes
                  </span>
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <TableFilterChips
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as 'all' | TakeStatus)}
                    options={[
                      { label: 'All Statuses', value: 'all' },
                      { label: 'In Progress', value: 'in_progress' },
                      { label: 'Completed', value: 'completed' },
                    ]}
                  />
                  <TableFilterChips
                    value={visibilityFilter}
                    onChange={(value) => setVisibilityFilter(value as 'all' | 'published' | 'hidden')}
                    options={[
                      { label: 'All Visibility', value: 'all' },
                      { label: 'Published', value: 'published' },
                      { label: 'Hidden', value: 'hidden' },
                    ]}
                  />
                  <TableFilterChips
                    value={heatFilter}
                    onChange={(value) => setHeatFilter(value as 'all' | 'clean' | 'flagged')}
                    options={[
                      { label: 'All Heat', value: 'all' },
                      { label: 'Clean', value: 'clean' },
                      { label: 'Flagged', value: 'flagged' },
                    ]}
                  />
                </div>
              </TableToolbar>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-hairline bg-soft-cloud/30">
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Student</th>
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Status</th>
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Score</th>
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Integrity</th>
                      <th className="px-6 py-2.5 text-right text-caption font-semibold uppercase tracking-wider text-ash">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-standard text-ink">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-ash">Loading results...</td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-ash">No exam takes found.</td>
                      </tr>
                    ) : filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-ash">No takes match the current search and filters.</td>
                      </tr>
                    ) : (
                      filteredResults.map((result, idx) => (
                        <motion.tr
                          key={result.id}
                          {...tableRowVariant}
                          transition={{ ...tableRowVariant.transition, delay: idx * 0.03 }}
                          className="cursor-pointer border-b border-hairline transition-colors hover:bg-soft-cloud/45"
                          onClick={() => openTakeReport(result)}
                        >
                          <td className="px-6 py-2.5">
                            <div className="flex flex-col">
                              <span className="text-[14px] font-semibold">{result.users?.name || 'Unknown Student'}</span>
                              <span className="text-[12px] text-ash">{result.users?.email || 'No email'}</span>
                              <span className="text-[11px] font-medium text-mute">
                                {(result.exams?.exam_name || 'Unknown Exam')} · #{result.id.slice(0, 8)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-2.5">
                            <StatusBadge status={result.status} />
                          </td>
                          <td className="px-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-[4px] px-2 py-1 text-[12px] font-semibold ${result.mcq_score >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                              >
                                MCQ {result.mcq_score}%
                              </span>
                              {result.coding_submissions && result.coding_submissions.length > 0 ? (
                                <span className={`rounded-[4px] px-2 py-1 text-[12px] font-semibold ${gradeColors[result.coding_grade || 'pending']}`}>
                                  Code {gradeLabels[result.coding_grade || 'pending']}
                                </span>
                              ) : (
                                <span className="text-[12px] text-ash">Code N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-2.5">
                            <AnomalyIndicator counts={getAnomalyCounts(result.cheating_logs)} />
                          </td>
                          <td className="px-6 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="filter"
                                className="min-w-[104px] text-[12px]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveCodeTab('overview');
                                  setActiveTestFilter('all');
                                  setSelectedCode({
                                    submissions: result.coding_submissions || [],
                                    resultId: result.id,
                                    currentGrade: result.coding_grade || 'pending',
                                    activeSubmissionIndex: 0,
                                  });
                                }}
                                disabled={!result.coding_submissions || result.coding_submissions.length === 0}
                              >
                                Inspect & Grade
                              </Button>
                              <Button
                                variant={result.show_to_student ? 'filter' : 'primary-blue'}
                                className="min-w-[84px] text-[12px]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleVisibility(result.id, result.show_to_student);
                                }}
                                disabled={result.status !== 'completed'}
                              >
                                {result.show_to_student ? 'Hide' : 'Publish'}
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {activeTakeReport && (
          <TakeReportDrawer
            open={Boolean(activeTakeReport)}
            title="Details Panel"
            subtitle={`${activeTakeReport.studentName} · ${activeTakeReport.examName} · #${activeTakeReport.resultId.slice(0, 8)}`}
            details={activeTakeReport.details}
            report={takeReport}
            snapshots={drawerSnapshots}
            loading={takeReportLoading}
            error={takeReportError}
            regenerating={takeReportRegenerating}
            onClose={() => {
              setActiveTakeReport(null);
              setTakeReport(null);
              setTakeReportError(null);
            }}
            onRegenerate={regenerateTakeReport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCode && (
          <motion.div
            {...overlayVariants}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
            onClick={() => setSelectedCode(null)}
          >
            <motion.div
              {...modalVariants}
              className="flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-hairline p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-card-title tracking-tight text-ink">Code Submission Inspector</h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedCode(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-soft-cloud text-ink transition-colors hover:bg-black/10"
                  >
                    ✕
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Grade</p>
                    <p className={`mt-1 inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${gradeColors[selectedCode.currentGrade]}`}>
                      {gradeLabels[selectedCode.currentGrade]}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Pass Rate</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">
                      {passRate !== null ? `${passRate}%` : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Tests</p>
                    <p className="mt-1 text-[13px] font-semibold text-ink">
                      {passedCount}/{totalCount} passed
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Runtime</p>
                    <p className={`mt-1 inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${runtimeBadge.className}`}>
                      {runtimeBadge.label} {activeSubmission?.executionTime ? `(${activeSubmission.executionTime}ms)` : ''}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-hairline bg-soft-cloud/40 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">Language</p>
                    <p className="mt-1 text-[13px] font-semibold uppercase text-ink">{activeSubmission?.language || 'N/A'}</p>
                  </div>
                </div>

                <p className="mt-3 text-[12px] font-medium text-ash">{inspectorRationale}</p>
              </div>

              <div className="border-b border-hairline bg-soft-cloud px-6 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <Button
                      variant={activeCodeTab === 'overview' ? 'primary-blue' : 'filter'}
                      size="xs"
                      onClick={() => setActiveCodeTab('overview')}
                    >
                      Overview
                    </Button>
                    <Button
                      variant={activeCodeTab === 'tests' ? 'primary-blue' : 'filter'}
                      size="xs"
                      onClick={() => setActiveCodeTab('tests')}
                    >
                      Test Results
                    </Button>
                    <Button
                      variant={activeCodeTab === 'source' ? 'primary-blue' : 'filter'}
                      size="xs"
                      onClick={() => setActiveCodeTab('source')}
                    >
                      Source Code
                    </Button>
                  </div>
                  {selectedCode.submissions.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ash">Submission</span>
                      <select
                        className="h-7 rounded-[7px] border border-hairline bg-white px-2 text-[11px] font-semibold text-ink outline-none focus:border-rausch"
                        value={selectedCode.activeSubmissionIndex}
                        onChange={(event) =>
                          setSelectedCode((prev) =>
                            prev ? { ...prev, activeSubmissionIndex: Number(event.target.value) } : prev,
                          )
                        }
                      >
                        {selectedCode.submissions.map((_, index) => (
                          <option key={index} value={index}>
                            Attempt {index + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex h-full flex-col gap-4 overflow-y-auto bg-soft-cloud p-6">
                {!activeSubmission ? (
                  <p className="pt-12 text-center text-body-standard text-ash">No code compiled.</p>
                ) : activeCodeTab === 'overview' ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-[10px] border border-hairline bg-white p-4">
                      <h3 className="text-[13px] font-semibold text-ink">Execution Snapshot</h3>
                      <div className="mt-3 space-y-2 text-[12px]">
                        <p className="text-ash">Language: <span className="font-semibold uppercase text-ink">{activeSubmission.language}</span></p>
                        <p className="text-ash">Runtime: <span className="font-semibold text-ink">{activeSubmission.executionTime}ms</span></p>
                        <p className="text-ash">Total tests: <span className="font-semibold text-ink">{totalCount}</span></p>
                        <p className="text-ash">Failed tests: <span className={`font-semibold ${failedCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{failedCount}</span></p>
                      </div>
                    </div>
                    <div className="rounded-[10px] border border-hairline bg-white p-4">
                      <h3 className="text-[13px] font-semibold text-ink">Quality Signal</h3>
                      <div className="mt-3 space-y-2 text-[12px]">
                        <p className="text-ash">
                          Current decision:
                          <span className={`ml-1 rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${gradeColors[selectedCode.currentGrade]}`}>
                            {gradeLabels[selectedCode.currentGrade]}
                          </span>
                        </p>
                        <p className="text-ash">
                          Confidence:
                          <span className="ml-1 font-semibold text-ink">
                            {passRate === null ? 'Manual review needed' : passRate >= 90 ? 'High' : passRate >= 60 ? 'Moderate' : 'Low'}
                          </span>
                        </p>
                        <p className="text-ash">
                          Recommendation:
                          <span className="ml-1 font-semibold text-ink">
                            {failedCount === 0 ? 'Pass candidate' : failedCount <= 2 ? 'Review before pass' : 'Fail or pending review'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : activeCodeTab === 'tests' ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-hairline bg-white p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-ash">Filters:</span>
                        <Button variant={activeTestFilter === 'all' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveTestFilter('all')}>
                          All ({activeTestResults.length})
                        </Button>
                        <Button variant={activeTestFilter === 'failed' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveTestFilter('failed')}>
                          Failed ({failedCount})
                        </Button>
                        <Button variant={activeTestFilter === 'passed' ? 'primary-blue' : 'filter'} size="xs" onClick={() => setActiveTestFilter('passed')}>
                          Passed ({passedCount})
                        </Button>
                      </div>
                      <span className="text-[12px] font-semibold text-ash">
                        Showing {filteredTestResults.length} / {activeTestResults.length}
                      </span>
                    </div>

                    {filteredTestResults.length === 0 ? (
                      <p className="rounded-[10px] border border-hairline bg-white p-6 text-center text-[12px] font-medium text-ash">
                        No test cases match current filter.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredTestResults.map((testResult, index) => (
                          <div
                            key={`${testResult.label}-${index}`}
                            className={`rounded-[10px] border bg-white p-3 ${testResult.passed ? 'border-emerald-200' : 'border-red-200'
                              }`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[12px] font-semibold text-ink">{testResult.label || `Test ${index + 1}`}</span>
                              <span
                                className={`rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${testResult.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}
                              >
                                {testResult.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-[12px] md:grid-cols-2">
                              <div className="rounded-[8px] bg-soft-cloud/60 p-2">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-mute">Expected</p>
                                <p className="font-mono text-ink">{testResult.expected}</p>
                              </div>
                              <div className="rounded-[8px] bg-soft-cloud/60 p-2">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-mute">Actual</p>
                                <p className={`font-mono ${testResult.passed ? 'text-ink' : 'text-red-600'}`}>
                                  {testResult.actual ?? testResult.expected}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[10px] border border-hairline bg-charcoal">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                        Source ({activeSubmission.language})
                      </span>
                      <span className="text-[11px] font-semibold text-white/60">{activeSubmission.executionTime}ms</span>
                    </div>
                    <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap px-4 py-4 font-mono text-[12px] leading-relaxed text-white/90">
                      {activeSubmission.code}
                    </pre>
                  </div>
                )}
              </div>

              <div className="border-t border-hairline bg-white px-6 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-ash">Decision:</span>
                    <span className="text-[12px] font-medium text-ink">{inspectorRationale}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedCode.currentGrade === 'passed' ? 'primary-blue' : 'filter'}
                      size="xs"
                      onClick={() => setCodingGrade(selectedCode.resultId, 'passed')}
                    >
                      Pass
                    </Button>
                    <Button
                      variant={selectedCode.currentGrade === 'failed' ? 'danger' : 'filter'}
                      size="xs"
                      onClick={() => setCodingGrade(selectedCode.resultId, 'failed')}
                    >
                      Fail
                    </Button>
                    <Button
                      variant={selectedCode.currentGrade === 'pending' ? 'primary-blue' : 'filter'}
                      size="xs"
                      onClick={() => setCodingGrade(selectedCode.resultId, 'pending')}
                    >
                      Pending
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}

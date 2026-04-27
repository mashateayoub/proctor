'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { TableSearchInput } from '@/components/ui/TableSearchInput';
import { TableFilterChips } from '@/components/ui/TableFilterChips';
import { useTableFilters } from '@/hooks/useTableFilters';
import { PROCTORING_SNAPSHOTS_BUCKET } from '@/lib/proctoringLogs';
import { fadeUp, scaleIn, overlayVariants, modalVariants, tableRowVariant, staggerContainer, staggerItem } from '@/lib/motion';

type TakeStatus = 'in_progress' | 'completed';
type CodingGrade = 'passed' | 'failed' | 'pending';

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
}

interface Screenshot {
  url: string;
  type: string;
  detectedAt: string;
  storagePath?: string;
  storageUrl?: string;
  storageMethod?: 'base64' | 'file+base64';
}

type SnapTab = 'camera' | 'browser';

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

export default function ResultsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<SelectedCodeState | null>(null);
  const [selectedScreenshots, setSelectedScreenshots] = useState<Screenshot[] | null>(null);
  const [activeSnapTab, setActiveSnapTab] = useState<SnapTab>('camera');
  const [signedSnapshotUrls, setSignedSnapshotUrls] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TakeStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [heatFilter, setHeatFilter] = useState<'all' | 'clean' | 'flagged'>('all');

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = async () => {
    setLoading(true);
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
      if (!selectedScreenshots || selectedScreenshots.length === 0) {
        setSignedSnapshotUrls({});
        return;
      }

      const storagePaths = Array.from(
        new Set(
          selectedScreenshots
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
  }, [selectedScreenshots, supabase]);

  const resolveSnapshotImageUrl = (snapshot: Screenshot) => {
    if (snapshot.storagePath && signedSnapshotUrls[snapshot.storagePath]) {
      return signedSnapshotUrls[snapshot.storagePath];
    }
    return snapshot.url;
  };

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
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Exam</th>
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Status</th>
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Timing</th>
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Performance</th>
                      <th className="px-6 py-2.5 text-caption font-semibold uppercase tracking-wider text-ash">Integrity</th>
                      <th className="px-6 py-2.5 text-right text-caption font-semibold uppercase tracking-wider text-ash">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-standard text-ink">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-ash">Loading results...</td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-ash">No exam takes found.</td>
                      </tr>
                    ) : filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-ash">No takes match the current search and filters.</td>
                      </tr>
                    ) : (
                      filteredResults.map((result, idx) => (
                        <motion.tr
                          key={result.id}
                          {...tableRowVariant}
                          transition={{ ...tableRowVariant.transition, delay: idx * 0.03 }}
                          className="border-b border-hairline transition-colors hover:bg-soft-cloud/45"
                        >
                          <td className="px-6 py-2.5">
                            <div className="flex flex-col">
                              <span className="text-[14px] font-semibold">{result.users?.name || 'Unknown Student'}</span>
                              <span className="text-[12px] text-ash">{result.users?.email || 'No email'}</span>
                              <span className="font-mono text-[11px] text-mute">Take #{result.id.slice(0, 8)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-2.5 text-[14px] font-medium">{result.exams?.exam_name || 'Unknown Exam'}</td>
                          <td className="px-6 py-2.5">
                            <StatusBadge status={result.status} />
                          </td>
                          <td className="px-6 py-2.5">
                            <div className="flex flex-col gap-0.5 text-[12px]">
                              <span className="font-medium text-ink">Start {formatDateTime(result.started_at || result.created_at)}</span>
                              <span className="text-ash">
                                {result.status === 'completed'
                                  ? `Duration ${formatDuration(result.started_at, result.created_at)}`
                                  : `Live for ${formatDuration(result.started_at, new Date().toISOString())}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-[4px] px-2 py-1 text-[12px] font-semibold ${
                                  result.mcq_score >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                                className="min-w-[108px] text-[12px]"
                                onClick={() => {
                                  const shots = getAnomalyScreenshots(result.cheating_logs);
                                  setSelectedScreenshots(shots);
                                  const hasCameraSnaps = shots.some((snap) => !isBrowserEvent(snap.type));
                                  setActiveSnapTab(hasCameraSnaps ? 'camera' : 'browser');
                                }}
                                disabled={getAnomalyScreenshots(result.cheating_logs).length === 0}
                              >
                                Snaps ({getAnomalyScreenshots(result.cheating_logs).length})
                              </Button>
                              <Button
                                variant="filter"
                                className="min-w-[120px] text-[12px]"
                                onClick={() =>
                                  setSelectedCode({
                                    submissions: result.coding_submissions || [],
                                    resultId: result.id,
                                    currentGrade: result.coding_grade || 'pending',
                                  })
                                }
                                disabled={!result.coding_submissions || result.coding_submissions.length === 0}
                              >
                                Inspect & Grade
                              </Button>
                              <Button
                                variant={result.show_to_student ? 'filter' : 'primary-blue'}
                                className="min-w-[96px] text-[12px]"
                                onClick={() => toggleVisibility(result.id, result.show_to_student)}
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
        {selectedCode && (
          <motion.div
            {...overlayVariants}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
            onClick={() => setSelectedCode(null)}
          >
            <motion.div
              {...modalVariants}
              className="flex max-h-[85vh] w-full max-w-[800px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-hairline p-6">
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

              <div className="border-b border-hairline bg-soft-cloud px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold text-ash">Your Grade:</span>
                    <motion.span
                      key={selectedCode.currentGrade}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`rounded-[6px] px-3 py-1 text-[12px] font-bold ${gradeColors[selectedCode.currentGrade]}`}
                    >
                      {gradeLabels[selectedCode.currentGrade]}
                    </motion.span>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCodingGrade(selectedCode.resultId, 'passed')}
                      className={`rounded-[6px] px-4 py-1.5 text-[12px] font-semibold transition-all ${
                        selectedCode.currentGrade === 'passed'
                          ? 'bg-green-600 text-white ring-2 ring-green-400'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      ✓ Pass
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCodingGrade(selectedCode.resultId, 'failed')}
                      className={`rounded-[6px] px-4 py-1.5 text-[12px] font-semibold transition-all ${
                        selectedCode.currentGrade === 'failed'
                          ? 'bg-red-600 text-white ring-2 ring-red-400'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      ✗ Fail
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCodingGrade(selectedCode.resultId, 'pending')}
                      className={`rounded-[6px] px-4 py-1.5 text-[12px] font-semibold transition-all ${
                        selectedCode.currentGrade === 'pending'
                          ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      ◷ Pending
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col gap-6 overflow-y-auto bg-soft-cloud p-6">
                {selectedCode.submissions.length === 0 ? (
                  <p className="pt-12 text-center text-body-standard text-ash">No code compiled.</p>
                ) : (
                  selectedCode.submissions.map((submission, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className="flex flex-col gap-4"
                    >
                      {submission.testResults && submission.testResults.length > 0 && (
                        <div className="rounded-[8px] bg-charcoal p-5">
                          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="text-[13px] font-semibold text-white">Test Suite Results</span>
                            <span
                              className={`rounded-[6px] px-3 py-1 text-[12px] font-bold ${
                                submission.passedCount === submission.totalCount
                                  ? 'bg-green-600/20 text-green-400'
                                  : 'bg-red-600/20 text-red-400'
                              }`}
                            >
                              {submission.passedCount}/{submission.totalCount} Passed
                            </span>
                          </div>
                          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-2">
                            {submission.testResults.map((testResult, j) => (
                              <motion.div
                                key={j}
                                variants={staggerItem}
                                className={`flex items-start gap-3 rounded-[6px] p-3 font-mono text-[12px] ${
                                  testResult.passed ? 'bg-green-900/10' : 'bg-red-900/10'
                                }`}
                              >
                                <span className={`mt-0.5 ${testResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                                  {testResult.passed ? '✓' : '✗'}
                                </span>
                                <div className="flex-1">
                                  <div className="mb-1 font-semibold text-white/80">{testResult.label}</div>
                                  <div className="text-white/40">
                                    Expected: <span className="text-green-300">{testResult.expected}</span>
                                    {!testResult.passed && (
                                      <> - Got: <span className="text-red-300">{testResult.actual}</span></>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        </div>
                      )}

                      <div className="overflow-hidden rounded-[8px] bg-charcoal p-6 font-mono text-[12px] text-white">
                        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                          <span className="uppercase tracking-wider text-[#ff385c]">{submission.language}</span>
                          <span className="text-white/60">{submission.executionTime}ms</span>
                        </div>
                        <pre className="whitespace-pre-wrap leading-relaxed opacity-90">{submission.code}</pre>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedScreenshots !== null &&
          (() => {
            const cameraSnaps = selectedScreenshots.filter((snap) => !isBrowserEvent(snap.type));
            const browserSnaps = selectedScreenshots.filter((snap) => isBrowserEvent(snap.type));

            return (
              <motion.div
                {...overlayVariants}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
                onClick={() => setSelectedScreenshots(null)}
              >
                <motion.div
                  {...modalVariants}
                  className="flex max-h-[85vh] w-full max-w-[800px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-b border-hairline p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-card-title tracking-tight text-ink">Detection Snaps</h2>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedScreenshots(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-soft-cloud text-ink transition-colors hover:bg-black/10"
                      >
                        ✕
                      </motion.button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={activeSnapTab === 'camera' ? 'primary-blue' : 'filter'}
                        className="min-w-[146px] text-[12px]"
                        onClick={() => setActiveSnapTab('camera')}
                      >
                        Camera ({cameraSnaps.length})
                      </Button>
                      <Button
                        variant={activeSnapTab === 'browser' ? 'primary-blue' : 'filter'}
                        className="min-w-[146px] text-[12px]"
                        onClick={() => setActiveSnapTab('browser')}
                      >
                        Browser ({browserSnaps.length})
                      </Button>
                    </div>
                  </div>
                  <div className="h-full overflow-y-auto bg-soft-cloud p-6">
                    {activeSnapTab === 'camera' ? (
                      cameraSnaps.length === 0 ? (
                        <p className="pt-12 text-center text-body-standard text-ash">No camera violation snapshots captured.</p>
                      ) : (
                        <motion.div
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                          className="grid grid-cols-1 gap-6 md:grid-cols-2"
                        >
                          {cameraSnaps.map((snap, i) => (
                            <motion.div key={`camera-${i}`} variants={staggerItem} className="flex flex-col gap-2">
                              <div className="relative aspect-video overflow-hidden rounded-[8px] bg-black/10 object-cover">
                                <img src={resolveSnapshotImageUrl(snap)} alt={`Camera violation: ${snap.type}`} className="h-full w-full object-cover" />
                              </div>
                              <div className="flex items-center justify-between px-1">
                                <span className="text-[12px] font-semibold uppercase tracking-wider text-red-500">{formatEventType(snap.type)}</span>
                                <span className="font-mono text-[11px] text-ash">{new Date(snap.detectedAt).toLocaleTimeString()}</span>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )
                    ) : browserSnaps.length === 0 ? (
                      <p className="pt-12 text-center text-body-standard text-ash">No browser event logs captured.</p>
                    ) : (
                      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-3">
                        {browserSnaps.map((snap, i) => (
                          <motion.div
                            key={`browser-${i}`}
                            variants={staggerItem}
                            className="flex items-center justify-between rounded-[10px] border border-hairline bg-white px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-7 items-center rounded-[999px] bg-slate-100 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                Browser
                              </span>
                              <span className="text-[13px] font-semibold text-ink">{formatEventType(snap.type)}</span>
                              <span className="inline-flex h-6 items-center rounded-[999px] bg-amber-100 px-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                Medium Risk
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-ash">{new Date(snap.detectedAt).toLocaleTimeString()}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                    {selectedScreenshots.length === 0 && (
                      <p className="pt-12 text-center text-body-standard text-ash">No images captured during this session.</p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </>
  );
}

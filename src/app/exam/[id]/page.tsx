'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import ProctorCamera from '@/components/ProctorCamera';
import { useExamLockdown, LockdownViolation } from '@/hooks/useExamLockdown';
import { persistProctoringLog } from '@/lib/proctoringLogs';

// Monaco editor for code block execution
import Editor from '@monaco-editor/react';

export default function LockedExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [codingQuestion, setCodingQuestion] = useState<any>(null);

  // Test State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<'mcq' | 'coding' | 'submitting'>('mcq');

  // Coding State
  const [code, setCode] = useState('// Write your solution here...\n');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [execResult, setExecResult] = useState<{ output: string; error: boolean; time: number } | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);

  // ── Browser violations stored in memory to batch-push at submit ──
  const [browserViolations, setBrowserViolations] = useState<LockdownViolation[]>([]);
  const [takeId, setTakeId] = useState<string | null>(null);
  const initTakeStartedRef = useRef(false);

  const handleViolation = useCallback((v: LockdownViolation) => {
    setBrowserViolations(prev => [...prev, v]);
  }, []);

  // ── Lockdown Hook ──
  const { isFullscreen, violationCount, showWarning, requestFullscreen } =
    useExamLockdown({
      enabled: !!exam && phase !== 'submitting',
      onViolation: handleViolation,
    });

  // ── Fetch Exam Data ──
  useEffect(() => {
    if (!examId || initTakeStartedRef.current) return;
    initTakeStartedRef.current = true;

    const fetchData = async () => {
      const { data: eData } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (eData) {
        setExam(eData);
        setTimeLeft(eData.duration_minutes * 60);
      }
      const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
      if (qData) setQuestions(qData);
      const { data: cData } = await supabase.from('coding_questions').select('*').eq('exam_id', examId);
      if (cData && cData.length > 0) setCodingQuestion(cData[0]);
    };
    fetchData();

    // ── Initialize or Resume "Exam Take" (idempotent) ──
    const initTake = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: activeTakes, error: activeTakeErr } = await supabase
        .from('results')
        .select('id, started_at, created_at')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (activeTakeErr) {
        console.error('Failed to query active take', activeTakeErr);
        return;
      }

      const existingTake = activeTakes?.[0];
      if (existingTake) {
        setTakeId(existingTake.id);
        return;
      }

      const { data: newTake, error: takeErr } = await supabase
        .from('results')
        .insert({
          exam_id: examId,
          student_id: user.id,
          status: 'in_progress',
          mcq_score: 0,
          show_to_student: false,
        })
        .select('id')
        .single();

      if (!takeErr && newTake) {
        setTakeId(newTake.id);
        return;
      }

      // Unique-index race fallback: fetch active row after failed insert.
      const { data: raceTake } = await supabase
        .from('results')
        .select('id')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1);

      if (raceTake?.[0]?.id) {
        setTakeId(raceTake[0].id);
      } else if (takeErr) {
        console.error('Failed to initialize exam take:', takeErr);
      }
    };
    initTake();
  }, [examId, supabase]);

  // ── Timer ──
  useEffect(() => {
    if (!exam || phase === 'submitting') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, phase]);

  const handleSelectOption = (qId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
  };

  const handleRunCode = async () => {
    setExecResult({ output: 'Running in Secure Environment...', error: false, time: 0 });
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setExecResult({ output: data.output || 'No output.', error: data.error, time: data.executionTime });
    } catch {
      setExecResult({ output: 'Failed to contact execution engine.', error: true, time: 0 });
    }
  };

  const calculateMcqScore = () => {
    if (questions.length === 0) return 100;
    let correct = 0;
    questions.forEach(q => {
      const selectedIdx = answers[q.id];
      if (selectedIdx !== undefined && q.options[selectedIdx].isCorrect) correct++;
    });
    return (correct / questions.length) * 100;
  };

  const handleSubmit = async () => {
    setPhase('submitting');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // ── Run test cases if they exist ──
    const mcqScore = calculateMcqScore();
    let codingSubmissions: any[] = [];

    if (codingQuestion) {
      const testCases = codingQuestion.test_cases || [];

      if (testCases.length > 0) {
        // Run code against teacher-defined test suite
        try {
          const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, testCases }),
          });
          const data = await res.json();
          codingSubmissions = [{
            code,
            language,
            executionTime: data.executionTime || 0,
            success: data.passedCount === data.totalCount,
            testResults: data.testResults || [],
            passedCount: data.passedCount || 0,
            totalCount: data.totalCount || 0,
          }];
        } catch {
          codingSubmissions = [{
            code,
            language,
            executionTime: 0,
            success: false,
            testResults: [],
            passedCount: 0,
            totalCount: testCases.length,
          }];
        }
      } else {
        // No test cases defined — store basic execution data
        codingSubmissions = [{
          code,
          language,
          executionTime: execResult?.time || 0,
          success: !execResult?.error,
        }];
      }
    }

    const { data: result, error: submitErr } = await supabase
      .from('results')
      .update({
        mcq_score: Math.round(mcqScore),
        coding_submissions: codingSubmissions,
        status: 'completed',
      })
      .eq('id', takeId)
      .select('id')
      .single();

    if (submitErr) {
      console.error('Critical: Failed to save exam submission', {
        error: submitErr,
        message: submitErr.message,
        details: submitErr.details,
        hint: submitErr.hint
      });
      alert(`Error submitting exam: ${submitErr.message || 'Please try again.'}`);
      setPhase('mcq');
      return;
    }

    // ── Persist browser violations and ensure this take appears in analytics ──
    {
      const violationCounts = browserViolations.reduce(
        (acc, v) => {
          if (v.type === 'fullscreen_exit') acc.fullscreen_exit++;
          if (v.type === 'tab_switch') acc.tab_switch++;
          if (v.type === 'copy' || v.type === 'paste' || v.type === 'cut') acc.clipboard++;
          if (v.type === 'right_click') acc.right_click++;
          if (v.type === 'devtools') acc.devtools++;
          if (v.type === 'print_screen') acc.print_screen++;
          return acc;
        },
        { fullscreen_exit: 0, tab_switch: 0, clipboard: 0, right_click: 0, devtools: 0, print_screen: 0 },
      );

      const browserScreenshots = browserViolations.map(v => ({
        url: '',
        type: `browser_${v.type}`,
        detectedAt: new Date(v.timestamp).toISOString(),
      }));

      const { error: logErr } = await persistProctoringLog(supabase, {
        examId,
        studentId: user.id,
        takeId: result.id,
        increments: {
          prohibitedObject:
            violationCounts.fullscreen_exit +
            violationCounts.tab_switch +
            violationCounts.clipboard +
            violationCounts.right_click +
            violationCounts.devtools +
            violationCounts.print_screen,
        },
        screenshots: browserScreenshots,
      });

      if (logErr) {
        alert('Exam submitted, but proctoring analytics failed to sync. Please contact your teacher.');
        console.error('Critical: Failed to save proctoring analytics', logErr);
        return;
      }
    }

    // ── Exit fullscreen cleanly then navigate ──
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    router.push('/student/dashboard');
  };

  // ── Loading State ──
  if (!exam) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[14px] text-white/60 font-mono">Initializing Secure Environment...</p>
        </div>
      </div>
    );
  }

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const isTimeCritical = timeLeft < 60;

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white flex flex-col overflow-hidden select-none"
         style={{ userSelect: 'none' }}
    >
      {/* ── Violation Warning Banner ── */}
      {showWarning && (
        <div className="fixed top-[48px] left-0 right-0 z-[200] flex justify-center pointer-events-none animate-pulse">
          <div className="bg-red-600/95 backdrop-blur-md text-white px-6 py-2 rounded-b-[8px] text-[13px] font-semibold shadow-2xl">
            {showWarning}
          </div>
        </div>
      )}

      {/* ── Fullscreen Re-entry Overlay ── */}
      {!isFullscreen && exam && phase !== 'submitting' && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center">
          <div className="text-center max-w-[400px]">
            <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-[24px] font-bold mb-3">Fullscreen Required</h2>
            <p className="text-white/60 text-[14px] mb-6">
              This exam must run in fullscreen mode. Exiting fullscreen has been logged as a violation.
              Click below to re-enter.
            </p>
            <p className="text-red-400 text-[13px] font-mono mb-6">
              Violations so far: {violationCount}
            </p>
            <button
              onClick={requestFullscreen}
              className="inline-flex h-9 items-center rounded-[8px] bg-white px-5 text-[13px] font-semibold text-black transition-colors hover:bg-white/90"
            >
              Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── Top Proctoring Bar ── */}
      <div className="h-[48px] min-h-[48px] bg-gradient-to-r from-red-700 via-red-600 to-red-700 flex justify-between items-center px-6 shadow-lg z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-semibold text-[13px] tracking-widest uppercase">
            Proctored Session
          </span>
          {violationCount > 0 && (
            <span className="bg-white/20 text-[11px] px-2 py-0.5 rounded-full font-mono">
              {violationCount} violation{violationCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <span className={`font-mono text-[21px] font-bold tabular-nums ${isTimeCritical ? 'text-yellow-300 animate-pulse' : ''}`}>
            {timeString}
          </span>
          <div className="bg-black/30 rounded-[4px] overflow-hidden w-[60px] h-[36px] relative">
            <ProctorCamera width={60} height={36} examId={examId} takeId={takeId || undefined} />
          </div>
        </div>
      </div>

      {/* ── MCQ Phase ── */}
      {phase === 'mcq' && questions.length > 0 && (
        <div className="flex-grow flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-[800px] bg-[#1a1a1a] border border-white/10 rounded-[12px] p-8 shadow-2xl">
            {/* Progress Dots */}
            <div className="flex items-center gap-1.5 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentIdx
                      ? 'w-6 bg-blue-500'
                      : answers[questions[i].id] !== undefined
                      ? 'w-3 bg-green-500/60'
                      : 'w-3 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-[12px] text-white/40 font-mono uppercase tracking-wider">
                Question {currentIdx + 1} of {questions.length}
              </span>
            </div>

            <h2 className="text-[21px] font-bold leading-tight mb-8">
              {questions[currentIdx].question_text}
            </h2>

            <div className="flex flex-col gap-3 mb-8">
              {questions[currentIdx].options.map((opt: any, idx: number) => {
                const isSelected = answers[questions[currentIdx].id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(questions[currentIdx].id, idx)}
                    className={`text-left rounded-[8px] border px-3 py-2.5 text-[13px] transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500/50'
                        : 'border-white/10 hover:border-white/30 text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-[12px] text-white/30 font-mono mr-3">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt.optionText}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button
                variant="filter"
                onClick={() => setCurrentIdx(prev => (prev > 0 ? prev - 1 : 0))}
                disabled={currentIdx === 0}
                size="sm"
                className="dark:bg-white/5"
              >
                ← Previous
              </Button>

              {currentIdx === questions.length - 1 ? (
                <Button
                  variant="primary-blue"
                  onClick={() => (codingQuestion ? setPhase('coding') : handleSubmit())}
                >
                  {codingQuestion ? 'Proceed to Coding →' : '✓ Submit Exam'}
                </Button>
              ) : (
                <Button variant="primary-blue" onClick={() => setCurrentIdx(prev => prev + 1)}>
                  Next →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Coding Phase ── */}
      {phase === 'coding' && codingQuestion && (
        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          {/* Problem Panel */}
          <div className="w-full lg:w-[380px] border-r border-white/10 bg-[#111] p-6 overflow-y-auto">
            <span className="text-[11px] text-white/30 font-mono uppercase tracking-wider">Coding Challenge</span>
            <h2 className="text-[18px] font-bold mt-2 mb-4">{codingQuestion.question_text}</h2>
            <p className="text-[14px] text-white/60 whitespace-pre-wrap leading-relaxed">
              {codingQuestion.description}
            </p>
          </div>

          {/* Editor Panel */}
          <div className="flex-1 flex flex-col bg-[#1e1e1e]">
            <div className="h-[44px] bg-[#252526] flex justify-between items-center px-4 border-b border-white/5">
              <select
                className="bg-[#1e1e1e] text-white/80 border border-white/10 rounded px-2 py-1 text-[12px] font-mono outline-none focus:border-blue-500"
                value={language}
                onChange={(e: any) => setLanguage(e.target.value)}
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3</option>
                <option value="java">Java (OpenJDK)</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleRunCode}
                  className="inline-flex h-8 items-center rounded bg-white/10 px-3 text-[11px] font-mono text-white transition-colors hover:bg-white/15"
                >
                  ▶ Run
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex h-8 items-center rounded bg-blue-600 px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Submit Exam
                </button>
              </div>
            </div>

            <div className="flex-grow relative">
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={val => setCode(val || '')}
                options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'monospace' }}
              />
            </div>

            {/* Console */}
            <div className="h-[180px] bg-[#0d0d0d] border-t border-white/5 overflow-y-auto p-4 font-mono text-[12px]">
              <div className="text-white/30 mb-2 text-[11px] uppercase tracking-wider">
                Output {execResult?.time ? `(${execResult.time}ms)` : ''}
              </div>
              {execResult && (
                <div className={`${execResult.error ? 'text-red-400' : 'text-green-400'} whitespace-pre-wrap`}>
                  {execResult.output}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Submitting Overlay ── */}
      {phase === 'submitting' && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-[21px] font-semibold mb-2">Syncing Proctor Artifacts...</h2>
            <p className="text-white/40 text-[13px]">Encrypting session data and code maps</p>
          </div>
        </div>
      )}
    </div>
  );
}

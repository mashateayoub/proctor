'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import ProctorCamera from '@/components/ProctorCamera';
import { persistProctoringLog } from '@/lib/proctoringLogs';
import { normalizeErrorMessage } from '@/lib/errors';

// Monaco editor for code block execution
import Editor from '@monaco-editor/react';

export default function ActiveExamPage() {
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
  const [language, setLanguage] = useState<'javascript'|'python'|'java'>('javascript');
  const [execResult, setExecResult] = useState<{output: string, error: boolean, time: number} | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [takeId, setTakeId] = useState<string | null>(null);
  const initTakeStartedRef = useRef(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    variant: 'error' | 'warning' | 'success' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!examId || initTakeStartedRef.current) return;
    initTakeStartedRef.current = true;

    const fetchData = async () => {
      // 1. Fetch Exam
      const { data: eData } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (eData) {
        setExam(eData);
        setTimeLeft(eData.duration_minutes * 60);
      }

      // 2. Fetch MCQs
      const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
      if (qData) setQuestions(qData);

      // 3. Fetch Coding Question (if any)
      const { data: cData } = await supabase.from('coding_questions').select('*').eq('exam_id', examId);
      if (cData && cData.length > 0) setCodingQuestion(cData[0]);
    };
    fetchData();

    // Initialize or Resume Take (idempotent)
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

      const { data: newTake, error: insertErr } = await supabase
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

      if (!insertErr && newTake) {
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
      } else if (insertErr) {
        console.error('Failed to initialize take', insertErr);
      }
    };

    initTake();
  }, [examId, supabase]);

  useEffect(() => {
    if (!exam || phase === 'submitting') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Auto-submit when time is up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, phase]);

  const handleSelectOption = (qId: string, optionIndex: number) => {
    setAnswers(prev => ({...prev, [qId]: optionIndex}));
  };

  const handleRunCode = async () => {
     setExecResult({ output: 'Running in Secure Environment...', error: false, time: 0 });
     try {
       const res = await fetch('/api/execute', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ code, language })
       });
       const data = await res.json();
       setExecResult({ output: data.output || 'No output.', error: data.error, time: data.executionTime });
     } catch (e) {
       setExecResult({ output: 'Failed to contact execution engine.', error: true, time: 0 });
     }
  };

  const calculateMcqScore = () => {
    if (questions.length === 0) return 100;
    let correct = 0;
    questions.forEach(q => {
      const selectedIdx = answers[q.id];
      if (selectedIdx !== undefined && q.options[selectedIdx].isCorrect) {
        correct++;
      }
    });
    if (questions.length === 0) return 100; // Default to 100% if no MCQ exist
    return (correct / questions.length) * 100;
  };

  const handleSubmit = async () => {
    setPhase('submitting');
    setSubmissionFeedback(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmissionFeedback({ variant: 'error', message: 'Authentication expired. Please sign in again.' });
      setPhase('mcq');
      return;
    }

    // Build Payload
    const mcqScore = calculateMcqScore();
    const codingSubmissions = codingQuestion ? [{ code, language, executionTime: execResult?.time || 0, success: !execResult?.error }] : [];

    const { data: result, error: submitErr } = await supabase
      .from('results')
      .update({
        mcq_score: Math.round(mcqScore),
        coding_submissions: codingSubmissions,
        status: 'completed'
      })
      .eq('id', takeId)
      .select('id')
      .single();

    if (submitErr) {
       console.error("Critical: Failed to save exam submission", {
         error: submitErr,
         message: submitErr.message,
         details: submitErr.details,
         hint: submitErr.hint
       });
       setSubmissionFeedback({
         variant: 'error',
         message: `Error submitting exam: ${normalizeErrorMessage(submitErr, 'Please try again.')}`,
       });
       setPhase('mcq');
       return;
    }

    const { error: logErr } = await persistProctoringLog(supabase, {
      examId,
      studentId: user.id,
      takeId: result.id,
    });

    if (logErr) {
       setSubmissionFeedback({
         variant: 'warning',
         message: 'Exam submitted, but proctoring analytics failed to sync. Please contact your teacher.',
       });
       console.error("Critical: Failed to save proctoring analytics", logErr);
       setPhase('mcq');
       return;
    }

    router.push('/student/dashboard');
  };

  if (!exam) return <div className="min-h-screen bg-soft-cloud flex items-center justify-center">Loading strict environment...</div>;

  const m: number = Math.floor(timeLeft / 60);
  const s: number = timeLeft % 60;
  const timeString = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-soft-cloud text-ink flex flex-col pt-[48px]">
      <div className="fixed left-1/2 top-[54px] z-[205] w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2">
        <FeedbackBanner
          message={submissionFeedback?.message || null}
          variant={submissionFeedback?.variant || 'info'}
          compact
          onDismiss={() => setSubmissionFeedback(null)}
        />
      </div>
      
      {/* Sticky Top Bar over the entire screen */}
      <div className="fixed top-0 left-0 right-0 h-[48px] bg-red-600 z-[100] flex justify-between items-center px-6 text-white overflow-hidden shadow-lg">
        <span className="font-semibold text-[14px] tracking-wide animate-pulse">ACTIVE PROCTORING ENGAGED</span>
        <div className="flex items-center gap-6">
          <span className="font-mono text-[21px] font-bold">{timeString}</span>
           <div className="bg-black/30 rounded-[4px] overflow-hidden w-[60px] h-[36px] relative">
              <ProctorCamera width={60} height={36} examId={examId} takeId={takeId || undefined} />
           </div>
        </div>
      </div>

       {phase === 'mcq' && questions.length > 0 && (
          <div className="flex-grow flex items-center justify-center p-6">
            <div className="w-full max-w-[800px] bg-white rounded-[12px] p-6 shadow-2xl border border-hairline">
              <div className="flex justify-between items-center mb-8 border-b border-hairline pb-4">
                <span className="text-caption text-ash font-semibold">Question {currentIdx + 1} of {questions.length}</span>
              </div>
              
              <h2 className="text-[21px] font-bold leading-tight mb-8">
                 {questions[currentIdx].question_text}
              </h2>
              
              <div className="flex flex-col gap-4 mb-8">
                 {questions[currentIdx].options.map((opt: any, idx: number) => {
                    const isSelected = answers[questions[currentIdx].id] === idx;
                    return (
                      <button 
                        key={idx}
                        onClick={() => handleSelectOption(questions[currentIdx].id, idx)}
                        className={`text-left rounded-[8px] border px-3 py-2.5 text-[13px] transition-colors ${isSelected ? 'bg-rausch border-rausch text-white' : 'border-hairline hover:border-ink'}`}
                      >
                         {opt.optionText}
                      </button>
                    )
                 })}
              </div>

               <div className="flex justify-between mt-auto">
                  <Button 
                    variant="filter" 
                    onClick={() => setCurrentIdx(prev => prev > 0 ? prev - 1 : 0)}
                    disabled={currentIdx === 0}
                  >
                     Previous
                  </Button>
 
                  {currentIdx === questions.length - 1 ? (
                    <Button variant="primary-blue" onClick={() => codingQuestion ? setPhase('coding') : handleSubmit()}>
                       {codingQuestion ? 'Proceed to Coding Phase' : '✓ Submit Exam'}
                    </Button>
                  ) : (
                    <Button variant="primary-blue" onClick={() => setCurrentIdx(prev => prev + 1)}>
                       Next
                    </Button>
                  )}
               </div>
           </div>
         </div>
      )}

      {phase === 'coding' && codingQuestion && (
         <div className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-48px)]">
            {/* Split Screen Component for Coding block */}
            <div className="w-full lg:w-1/3 border-r border-hairline bg-soft-cloud p-6 overflow-y-auto">
               <h2 className="text-card-title mb-4">{codingQuestion.question_text}</h2>
               <p className="text-body-standard text-ash whitespace-pre-wrap">
                 {codingQuestion.description}
               </p>
            </div>
            <div className="w-full lg:w-2/3 flex flex-col bg-[#1e1e1e]">
               <div className="h-[48px] bg-[#2d2d2d] flex justify-between items-center px-4">
                  <select 
                    className="bg-[#1e1e1e] text-white border border-white/20 rounded px-2 py-1 text-[12px] font-mono outline-none focus:border-rausch"
                    value={language}
                    onChange={(e: any) => setLanguage(e.target.value)}
                  >
                     <option value="javascript">JavaScript (Node.js)</option>
                     <option value="python">Python 3</option>
                     <option value="java">Java (OpenJDK)</option>
                  </select>
                  <div className="flex gap-2">
                     <Button variant="pill-link" size="xs" className="text-white border-white border" onClick={handleRunCode}>Run Code</Button>
                     <Button variant="primary-blue" size="xs" onClick={handleSubmit}>Submit Test</Button>
                  </div>
               </div>
               
               <div className="flex-grow relative">
                 <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'monospace' }}
                 />
               </div>

               {/* Console Output block */}
               <div className="h-[200px] bg-black border-t border-white/10 overflow-y-auto p-4 text-white font-mono text-[12px]">
                  <div className="text-white/50 mb-2">Terminal Output ({execResult?.time || 0}ms)</div>
                  {execResult && (
                    <div className={`${execResult.error ? 'text-red-400' : 'text-green-400'} whitespace-pre-wrap`}>
                       {execResult.output}
                    </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {phase === 'submitting' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center text-white">
           <h2 className="text-card-title animate-pulse">Syncing Proctor Artifacts and Code Maps...</h2>
        </div>
      )}
    </div>
  );
}

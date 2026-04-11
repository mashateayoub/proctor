'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ResultsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<{ submissions: any[]; resultId: string; currentGrade: string } | null>(null);

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('results')
      .select(`
        id, mcq_score, coding_submissions, coding_grade, show_to_student, created_at,
        exams ( exam_name ),
        users ( name, email )
      `)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setResults(data);
    }
    setLoading(false);
  };

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('results')
      .update({ show_to_student: !currentStatus })
      .eq('id', id);

    if (!error) {
       setResults(results.map(r => r.id === id ? { ...r, show_to_student: !currentStatus } : r));
    }
  };

  const setCodingGrade = async (resultId: string, grade: 'passed' | 'failed' | 'pending') => {
    const { error } = await supabase
      .from('results')
      .update({ coding_grade: grade })
      .eq('id', resultId);

    if (!error) {
      setResults(results.map(r => r.id === resultId ? { ...r, coding_grade: grade } : r));
      if (selectedCode && selectedCode.resultId === resultId) {
        setSelectedCode({ ...selectedCode, currentGrade: grade });
      }
    }
  };

  const gradeColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    passed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };

  const gradeLabels: Record<string, string> = {
    pending: 'Pending Review',
    passed: 'Passed',
    failed: 'Failed',
  };

  return (
    <>
      <div className="w-full">
        <div className="max-w-[1200px] mx-auto">
          
          <div className="mb-12">
             <h1 className="text-section-heading text-apple-dark dark:text-white mb-2 tracking-tight">Examination Results.</h1>
             <p className="text-body-standard text-black/80 dark:text-white/80 max-w-[600px]">
               View quantitative outcomes, inspect and grade coding submissions, and publish grades.
             </p>
          </div>

          <Card elevated className="bg-white dark:bg-[#1d1d1f]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5">
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Student</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Exam</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">MCQ Score</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50">Coding Grade</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50 text-right">Code Review</th>
                    <th className="px-6 py-4 text-caption font-semibold text-black/50 dark:text-white/50 text-right">Visibility</th>
                  </tr>
                </thead>
                <tbody className="text-body-standard text-apple-dark dark:text-white">
                  {loading ? (
                     <tr><td colSpan={6} className="text-center py-12 text-black/50">Loading results...</td></tr>
                  ) : results.length === 0 ? (
                     <tr><td colSpan={6} className="text-center py-12 text-black/50">No exam results found for your schemas.</td></tr>
                  ) : (
                    results.map((r) => (
                      <tr key={r.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[14px]">{r.users?.name || 'Unknown'}</span>
                            <span className="text-[12px] text-black/60 dark:text-white/60">{r.users?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[14px]">{r.exams?.exam_name}</td>
                        <td className="px-6 py-4">
                           <span className={`text-[12px] px-2 py-1 rounded-[4px] font-semibold ${r.mcq_score >= 50 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
                              {r.mcq_score}%
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          {r.coding_submissions && r.coding_submissions.length > 0 ? (
                            <span className={`text-[12px] px-2 py-1 rounded-[4px] font-semibold ${gradeColors[r.coding_grade || 'pending']}`}>
                              {gradeLabels[r.coding_grade || 'pending']}
                            </span>
                          ) : (
                            <span className="text-[12px] text-black/30 dark:text-white/30">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="filter" 
                            className="h-[30px] text-[12px]"
                            onClick={() => setSelectedCode({
                              submissions: r.coding_submissions || [],
                              resultId: r.id,
                              currentGrade: r.coding_grade || 'pending'
                            })}
                            disabled={!r.coding_submissions || r.coding_submissions.length === 0}
                          >
                            Inspect & Grade
                          </Button>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <Button 
                             variant={r.show_to_student ? 'filter' : 'primary-blue'} 
                             className="h-[30px] text-[12px]"
                             onClick={() => toggleVisibility(r.id, r.show_to_student)}
                           >
                              {r.show_to_student ? 'Hide from Student' : 'Publish Result'}
                           </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
    </div>

      {/* Code Inspector + Grading Modal */}
      {selectedCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setSelectedCode(null)}>
          <div 
            className="w-full max-w-[800px] max-h-[85vh] bg-white dark:bg-[#1d1d1f] rounded-[16px] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
              <h2 className="text-card-title text-apple-dark dark:text-white tracking-tight">Code Submission Inspector</h2>
              <button 
                onClick={() => setSelectedCode(null)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-apple-dark dark:text-white hover:bg-black/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Teacher Grading Controls */}
            <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 bg-[#fafafc] dark:bg-[#111]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-black/60 dark:text-white/60">Your Grade:</span>
                  <span className={`text-[12px] px-3 py-1 rounded-[6px] font-bold ${gradeColors[selectedCode.currentGrade]}`}>
                    {gradeLabels[selectedCode.currentGrade]}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCodingGrade(selectedCode.resultId, 'passed')}
                    className={`px-4 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                      selectedCode.currentGrade === 'passed'
                        ? 'bg-green-600 text-white ring-2 ring-green-400'
                        : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    ✓ Pass
                  </button>
                  <button
                    onClick={() => setCodingGrade(selectedCode.resultId, 'failed')}
                    className={`px-4 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                      selectedCode.currentGrade === 'failed'
                        ? 'bg-red-600 text-white ring-2 ring-red-400'
                        : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    ✗ Fail
                  </button>
                  <button
                    onClick={() => setCodingGrade(selectedCode.resultId, 'pending')}
                    className={`px-4 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all ${
                      selectedCode.currentGrade === 'pending'
                        ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}
                  >
                    ◷ Pending
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-apple-gray dark:bg-black h-full flex flex-col gap-6">
               {selectedCode.submissions.length === 0 ? (
                 <p className="text-center text-body-standard text-black/60 pt-12">No code compiled.</p>
               ) : (
                 selectedCode.submissions.map((sub, i) => (
                   <div key={i} className="flex flex-col gap-4">
                      {/* Test Results Breakdown */}
                      {sub.testResults && sub.testResults.length > 0 && (
                        <div className="bg-[#272729] rounded-[8px] p-5">
                          <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                            <span className="text-[13px] font-semibold text-white">Test Suite Results</span>
                            <span className={`text-[12px] font-bold px-3 py-1 rounded-[6px] ${
                              sub.passedCount === sub.totalCount
                                ? 'bg-green-600/20 text-green-400'
                                : 'bg-red-600/20 text-red-400'
                            }`}>
                              {sub.passedCount}/{sub.totalCount} Passed
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {sub.testResults.map((tr: any, j: number) => (
                              <div key={j} className={`flex items-start gap-3 p-3 rounded-[6px] text-[12px] font-mono ${
                                tr.passed ? 'bg-green-900/10' : 'bg-red-900/10'
                              }`}>
                                <span className={`mt-0.5 ${tr.passed ? 'text-green-400' : 'text-red-400'}`}>
                                  {tr.passed ? '✓' : '✗'}
                                </span>
                                <div className="flex-1">
                                  <div className="text-white/80 font-semibold mb-1">{tr.label}</div>
                                  <div className="text-white/40">
                                    Expected: <span className="text-green-300">{tr.expected}</span>
                                    {!tr.passed && (
                                      <> — Got: <span className="text-red-300">{tr.actual}</span></>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Code Block */}
                      <div className="bg-[#272729] rounded-[8px] overflow-hidden p-6 text-white font-mono text-[12px]">
                         <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                           <span className="text-[#0071e3] uppercase font-bold tracking-wider">{sub.language}</span>
                           <span className="text-white/60">{sub.executionTime}ms</span>
                         </div>
                         <pre className="whitespace-pre-wrap leading-relaxed opacity-90">{sub.code}</pre>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

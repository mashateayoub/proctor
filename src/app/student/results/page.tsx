'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { fadeUp, fadeIn, staggerContainer, staggerItem } from '@/lib/motion';

export default function StudentResultsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // RLS Policy ensures they can only read if `student_id = auth.uid()` AND `show_to_student = true`
    const { data, error } = await supabase
      .from('results')
      .select(`
        id, mcq_score, coding_submissions, coding_grade, created_at,
        exams ( exam_name, duration_minutes )
      `)
      .order('created_at', { ascending: false });

    if (data && !error) setResults(data);
    setLoading(false);
  };

  return (
    <div className="w-full">
        <div className="max-w-[1024px] mx-auto">
          
          <motion.div {...fadeUp} className="mb-12">
             <h1 className="text-section-heading text-apple-dark dark:text-white mb-2 tracking-tight">Your Transcripts.</h1>
             <p className="text-body-standard text-black/80 dark:text-white/80 max-w-[600px]">
               Published assessment results. If an exam is missing, the instructor has not released grading yet.
             </p>
          </motion.div>

          {loading ? (
             <motion.p {...fadeIn} className="text-center text-caption text-black/50 dark:text-white/50 py-12">Fetching secure records...</motion.p>
          ) : results.length === 0 ? (
             <motion.div {...fadeIn} className="text-center py-24 bg-white dark:bg-[#1d1d1f] rounded-[12px]">
                <p className="text-body-standard text-black/80 dark:text-white/80">No published results exist on your transcript.</p>
             </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
               {results.map((r) => (
                 <motion.div key={r.id} variants={staggerItem}>
                   <Card elevated className="p-8 bg-white dark:bg-[#272729]" delay={0}>
                      <div className="flex justify-between items-start mb-6">
                         <span className="text-caption font-mono uppercase tracking-wider text-black/40 dark:text-white/40">
                           {new Date(r.created_at).toLocaleDateString()}
                         </span>
                         <span className={`px-3 py-1 rounded-[6px] text-[14px] font-bold ${r.mcq_score >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {r.mcq_score}%
                         </span>
                      </div>
                      
                      <h3 className="text-card-title text-apple-dark dark:text-white mb-2 leading-tight">
                         {r.exams?.exam_name}
                      </h3>
                      <p className="text-body-standard text-black/60 dark:text-white/60 mb-6">
                         Duration: {r.exams?.duration_minutes}m
                      </p>

                      {r.coding_submissions && r.coding_submissions.length > 0 && (
                        <div className="border-t border-black/10 dark:border-white/10 pt-6">
                           <h4 className="text-[14px] font-semibold text-apple-dark dark:text-white mb-4">Coding Component</h4>
                           {/* Teacher-controlled grade */}
                           <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-[8px] mb-3">
                              <span className="text-[13px] font-medium text-black/60 dark:text-white/60">Instructor Grade</span>
                              <span className={`text-[12px] font-bold px-3 py-1 rounded-[6px] ${
                                r.coding_grade === 'passed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                  : r.coding_grade === 'failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                              }`}>
                                {r.coding_grade === 'passed' ? 'PASSED' : r.coding_grade === 'failed' ? 'FAILED' : 'PENDING REVIEW'}
                              </span>
                           </div>
                           {/* Test suite results */}
                           {r.coding_submissions.map((sub: any, i: number) => (
                              <div key={i}>
                                {sub.testResults && sub.testResults.length > 0 ? (
                                  <div className="bg-black/5 dark:bg-white/5 rounded-[8px] p-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-[12px] font-semibold text-black/60 dark:text-white/60">Test Suite</span>
                                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-[4px] ${
                                        sub.passedCount === sub.totalCount
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                      }`}>
                                        {sub.passedCount}/{sub.totalCount} passed
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      {sub.testResults.map((tr: any, j: number) => (
                                        <motion.div
                                          key={j}
                                          initial={{ opacity: 0, x: -8 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: j * 0.05 }}
                                          className="flex items-center gap-2 text-[11px]"
                                        >
                                          <span className={tr.passed ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                                            {tr.passed ? '✓' : '✗'}
                                          </span>
                                          <span className="text-black/60 dark:text-white/60">{tr.label}</span>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center p-3 rounded-[8px] text-[11px] text-black/40 dark:text-white/40">
                                     <span className="font-mono uppercase">{sub.language}</span>
                                     <span>Auto-run: {sub.success ? 'No errors' : 'Errored'} • {sub.executionTime || 0}ms</span>
                                  </div>
                                )}
                              </div>
                           ))}
                        </div>
                      )}
                   </Card>
                 </motion.div>
               ))}
            </motion.div>
          )}

        </div>
    </div>
  );
}

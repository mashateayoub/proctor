'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { fadeUp, fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/motion';

interface TestCase {
  label: string;
  input: string;
  expectedOutput: string;
}

export default function CreateExamPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examData, setExamData] = useState({
    exam_name: '',
    duration_minutes: 60,
    total_questions: 10,
    live_date: '',
    dead_date: ''
  });

  const [codingQuestion, setCodingQuestion] = useState({
    question_text: '',
    description: ''
  });

  // ── Test Cases State ──
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  const addTestCase = () => {
    setTestCases([...testCases, { label: '', input: '', expectedOutput: '' }]);
  };

  const removeTestCase = (idx: number) => {
    setTestCases(testCases.filter((_, i) => i !== idx));
  };

  const updateTestCase = (idx: number, field: keyof TestCase, value: string) => {
    setTestCases(testCases.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Get current Teacher ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    // 2. Insert Exam
    const generatedPin = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        teacher_id: user.id,
        exam_name: examData.exam_name,
        duration_minutes: examData.duration_minutes,
        total_questions: examData.total_questions,
        live_date: new Date(examData.live_date).toISOString(),
        dead_date: new Date(examData.dead_date).toISOString(),
        pin_code: generatedPin
      })
      .select()
      .single();

    if (examError || !exam) {
      console.error(examError);
      setError("Failed to create Exam setup.");
      setLoading(false);
      return;
    }

    // 3. Insert Coding Question with Test Cases
    if (codingQuestion.question_text.trim() !== '') {
      const { error: codeError } = await supabase
        .from('coding_questions')
        .insert({
          exam_id: exam.id,
          question_text: codingQuestion.question_text,
          description: codingQuestion.description,
          test_cases: testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim())
        });
      
      if (codeError) {
         console.error("Failed to append coding question", codeError);
      }
    }

    setLoading(false);
    router.push('/teacher/dashboard');
  };

  const inputStyles = "w-full bg-[#f5f5f7] dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-[8px] px-[16px] py-[12px] text-body-standard focus:outline-none focus:border-apple-blue transition-colors";

  return (
    <div className="w-full">
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <h1 className="text-section-heading text-apple-dark dark:text-white mb-2">New Assessment.</h1>
            <p className="text-body-standard text-black/80 dark:text-white/80">Configure timeline, constraints, and standard coding structures.</p>
          </motion.div>

          <motion.form
            onSubmit={handleCreate}
            className="flex flex-col gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-center text-red-500 text-caption font-semibold"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            
            {/* Base Meta Settings */}
            <Card elevated className="p-8 bg-white dark:bg-[#272729]" delay={0.05}>
               <h3 className="text-card-title text-apple-dark dark:text-white mb-6 tracking-tight">Timeline & Details</h3>
               <div className="flex flex-col gap-5">
                 <div>
                    <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Course or Assessment Name</label>
                    <input
                      required
                      type="text"
                      className={inputStyles}
                      placeholder="e.g. CS-101 Final Exam"
                      value={examData.exam_name}
                      onChange={e => setExamData({...examData, exam_name: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Duration (Minutes)</label>
                      <input
                        required
                        type="number"
                        min={1}
                        className={inputStyles}
                        value={examData.duration_minutes}
                        onChange={e => setExamData({...examData, duration_minutes: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Total MCQ Count</label>
                      <input
                        required
                        type="number"
                        min={0}
                        className={inputStyles}
                        value={examData.total_questions}
                        onChange={e => setExamData({...examData, total_questions: Number(e.target.value)})}
                      />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Live Date</label>
                      <input
                        required
                        type="datetime-local"
                        className={inputStyles}
                        value={examData.live_date}
                        onChange={e => setExamData({...examData, live_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Dead Date</label>
                      <input
                        required
                        type="datetime-local"
                        className={inputStyles}
                        value={examData.dead_date}
                        onChange={e => setExamData({...examData, dead_date: e.target.value})}
                      />
                    </div>
                 </div>
               </div>
            </Card>

            {/* Attached Programming Scenario */}
            <Card elevated className="p-8 bg-white dark:bg-[#272729]" delay={0.15}>
               <h3 className="text-card-title text-apple-dark dark:text-white mb-2 tracking-tight">Programming Challenge</h3>
               <p className="text-caption text-black/60 dark:text-white/60 mb-6">Attach an optional comprehensive coding problem to the end of this exam.</p>
               <div className="flex flex-col gap-5">
                 <div>
                    <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Short Title / Objective</label>
                    <input
                      type="text"
                      className={inputStyles}
                      placeholder="e.g. Binary Tree Inversion"
                      value={codingQuestion.question_text}
                      onChange={e => setCodingQuestion({...codingQuestion, question_text: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Extended Description & Testing Requirements</label>
                    <textarea
                      rows={5}
                      className={`${inputStyles} resize-none`}
                      placeholder="Specify inputs, outputs, and any algorithmic boundaries..."
                      value={codingQuestion.description}
                      onChange={e => setCodingQuestion({...codingQuestion, description: e.target.value})}
                    />
                 </div>
               </div>
            </Card>

            {/* ── Test Suite Builder ── */}
            <AnimatePresence>
              {codingQuestion.question_text.trim() !== '' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                >
                  <Card elevated className="p-8 bg-white dark:bg-[#272729]" delay={0}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-card-title text-apple-dark dark:text-white tracking-tight">Test Suite</h3>
                      <span className="text-[12px] font-mono text-black/40 dark:text-white/40">
                        {testCases.length} test{testCases.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-caption text-black/60 dark:text-white/60 mb-6">
                      Define input/output pairs. The student&apos;s code will receive the input via <strong>stdin</strong> and 
                      must print the expected output to <strong>stdout</strong>.
                    </p>

                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="flex flex-col gap-4"
                    >
                      <AnimatePresence>
                        {testCases.map((tc, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            layout
                            className="bg-[#f5f5f7] dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[10px] p-5"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[12px] font-mono text-black/40 dark:text-white/40 uppercase tracking-wider">
                                Test Case #{idx + 1}
                              </span>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => removeTestCase(idx)}
                                className="text-[11px] text-red-500 hover:text-red-700 font-semibold transition-colors"
                              >
                                Remove
                              </motion.button>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div>
                                <label className="text-[11px] text-black/50 dark:text-white/50 mb-1 block uppercase tracking-wider">Label (optional)</label>
                                <input
                                  type="text"
                                  className="w-full bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-[6px] px-3 py-2 text-[13px] focus:outline-none focus:border-apple-blue"
                                  placeholder="e.g. Basic addition"
                                  value={tc.label}
                                  onChange={e => updateTestCase(idx, 'label', e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[11px] text-black/50 dark:text-white/50 mb-1 block uppercase tracking-wider">
                                    Input (stdin)
                                  </label>
                                  <textarea
                                    rows={2}
                                    className="w-full resize-none bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-[6px] px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-apple-blue"
                                    placeholder={"5\\n3"}
                                    value={tc.input}
                                    onChange={e => updateTestCase(idx, 'input', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-black/50 dark:text-white/50 mb-1 block uppercase tracking-wider">
                                    Expected Output (stdout)
                                  </label>
                                  <textarea
                                    rows={2}
                                    className="w-full resize-none bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-[6px] px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-apple-blue"
                                    placeholder="8"
                                    value={tc.expectedOutput}
                                    onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      <motion.button
                        type="button"
                        onClick={addTestCase}
                        whileHover={{ borderColor: '#0071e3', color: '#0071e3', scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full py-3 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[10px] text-[13px] font-semibold text-black/40 dark:text-white/40 transition-colors"
                      >
                        + Add Test Case
                      </motion.button>
                    </motion.div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.3 }}
              className="flex justify-end gap-4 mt-4"
            >
              <Button type="button" variant="pill-link" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" variant="primary-blue" disabled={loading} className="w-[140px]">
                 {loading ? 'Committing...' : 'Publish Draft'}
              </Button>
            </motion.div>
          </motion.form>

        </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import { useToast } from '@/components/ui/ToastProvider';
import { fadeUp, fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/motion';
import { normalizeErrorMessage } from '@/lib/errors';

interface TestCase {
  label: string;
  input: string;
  expectedOutput: string;
}

export default function CreateExamPage() {
  const router = useRouter();
  const { showToast } = useToast();
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
      setError(normalizeErrorMessage(examError, 'Failed to create exam setup.'));
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
         showToast({
           variant: 'warning',
           title: 'Exam created',
           message: 'Coding question could not be attached. You can add it later.',
         });
      }
    }

    setLoading(false);
    showToast({
      variant: 'success',
      title: 'Exam created',
      message: 'Assessment has been created successfully.',
    });
    router.push('/teacher/dashboard');
  };

  const inputStyles = "w-full bg-[var(--color-soft-cloud)] border border-[var(--color-hairline)] rounded-[8px] px-4 py-2.5 text-[14px] font-medium focus:outline-none focus:border-[var(--color-rausch)] transition-all";

  return (
    <div className="w-full">
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fadeUp} className="mb-6 text-center">
            <h1 className="text-[28px] font-display font-bold text-[var(--color-ink)] mb-2">New Assessment.</h1>
            <p className="text-[14px] text-[var(--color-ash)] font-medium">Configure timeline, constraints, and programming tasks.</p>
          </motion.div>

          <motion.form
            onSubmit={handleCreate}
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <AnimatePresence mode="wait">
              <FeedbackBanner message={error} variant="error" />
            </AnimatePresence>
            
            {/* Base Meta Settings */}
            <Card elevated className="p-6 bg-white rounded-[16px]" delay={0.05}>
               <h3 className="text-[18px] font-display font-bold text-[var(--color-ink)] mb-6 tracking-tight">Timeline & Details</h3>
               <div className="flex flex-col gap-4">
                 <div>
                    <label className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider mb-1 block">Course or Assessment Name</label>
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
                      <label className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider mb-1 block">Duration (Minutes)</label>
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
                      <label className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider mb-1 block">Total MCQ Count</label>
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
                      <label className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider mb-1 block">Live Date</label>
                      <input
                        required
                        type="datetime-local"
                        className={inputStyles}
                        value={examData.live_date}
                        onChange={e => setExamData({...examData, live_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider mb-1 block">Dead Date</label>
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
            <Card elevated className="p-6 bg-white rounded-[16px]" delay={0.15}>
               <h3 className="text-[18px] font-display font-bold text-[var(--color-ink)] mb-2 tracking-tight">Programming Challenge</h3>
               <p className="text-[12px] text-[var(--color-ash)] mb-6 font-medium">Attach an optional coding problem to the end of this exam.</p>
               <div className="flex flex-col gap-4">
                 <div>
                    <label className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider mb-1 block">Short Title / Objective</label>
                    <input
                      type="text"
                      className={inputStyles}
                      placeholder="e.g. Binary Tree Inversion"
                      value={codingQuestion.question_text}
                      onChange={e => setCodingQuestion({...codingQuestion, question_text: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider mb-1 block">Extended Description</label>
                    <textarea
                      rows={4}
                      className={`${inputStyles} resize-none`}
                      placeholder="Specify boundaries, constraints, and requirements..."
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
                  <Card elevated className="p-6 bg-white rounded-[16px]" delay={0}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-[18px] font-display font-bold text-[var(--color-ink)] tracking-tight">Test Suite</h3>
                      <span className="text-[10px] font-bold text-[var(--color-mute)] uppercase tracking-widest">
                        {testCases.length} CASE{testCases.length !== 1 ? 'S' : ''}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--color-ash)] mb-6 font-medium leading-relaxed">
                      Define input/output pairs. The system will pipe <strong>stdin</strong> and expect specific <strong>stdout</strong> results.
                    </p>

                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="flex flex-col gap-3"
                    >
                      <AnimatePresence>
                        {testCases.map((tc, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="bg-[var(--color-soft-cloud)] border border-[var(--color-hairline)] rounded-[10px] p-4"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold text-[var(--color-mute)] uppercase tracking-widest">
                                Case #{idx + 1}
                              </span>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => removeTestCase(idx)}
                                className="text-[10px] text-[var(--color-rausch)] font-bold uppercase tracking-wider hover:underline"
                              >
                                Remove
                              </motion.button>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-[var(--color-ash)] mb-1 block uppercase tracking-widest">
                                    Input
                                  </label>
                                  <textarea
                                    rows={2}
                                    className="w-full resize-none bg-white border border-[var(--color-hairline)] rounded-[6px] px-3 py-2 text-[13px] font-mono font-medium focus:outline-none focus:border-[var(--color-rausch)]"
                                    placeholder="stdin"
                                    value={tc.input}
                                    onChange={e => updateTestCase(idx, 'input', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-[var(--color-ash)] mb-1 block uppercase tracking-widest">
                                    Output
                                  </label>
                                  <textarea
                                    rows={2}
                                    className="w-full resize-none bg-white border border-[var(--color-hairline)] rounded-[6px] px-3 py-2 text-[13px] font-mono font-medium focus:outline-none focus:border-[var(--color-rausch)]"
                                    placeholder="stdout"
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
                        whileHover={{ borderColor: '#ff385c', color: '#ff385c', scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        className="w-full py-2.5 border-2 border-dashed border-[var(--color-hairline)] rounded-[10px] text-[13px] font-bold text-[var(--color-mute)] transition-all hover:bg-[var(--color-rausch)]/5"
                      >
                        + Add Case
                      </motion.button>
                    </motion.div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.3 }}
              className="flex justify-end gap-3 mt-2"
            >
              <Button type="button" variant="pill" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loading} className="w-[140px]">
                 {loading ? 'Publishing...' : 'Publish Draft'}
              </Button>
            </motion.div>
          </motion.form>

        </div>
    </div>
  );
}

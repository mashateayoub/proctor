'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { fadeUp, fadeIn } from '@/lib/motion';

interface Exam {
  id: string;
  exam_name: string;
}

export default function AddQuestionsPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  // Fetch Teacher's active exams to bind questions to
  useEffect(() => {
    const loadExams = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('exams')
        .select('id, exam_name')
        .eq('teacher_id', user.id);
        
      if (data) {
        setExams(data);
        if (data.length > 0) setSelectedExamId(data[0].id);
      }
    };
    loadExams();
  }, [supabase]);

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].optionText = text;
    setOptions(newOptions);
  };

  const handleSetCorrect = (index: number) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess('');

    if (!selectedExamId) {
      setError("Please select a valid exam.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('questions')
      .insert({
        exam_id: selectedExamId,
        question_text: questionText,
        options: options
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess("Question successfully added to bank!");
      setQuestionText('');
      setOptions([
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false }
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="w-full">
        <div className="max-w-[700px] mx-auto">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <h1 className="text-section-heading text-apple-dark dark:text-white mb-2">Build Content.</h1>
            <p className="text-body-standard text-black/80 dark:text-white/80">Add multiple choice variations directly into specific exams.</p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
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
              {success && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center text-[#0071e3] text-caption font-semibold"
                >
                  {success}
                </motion.p>
              )}
            </AnimatePresence>
            
            <Card elevated className="p-8 bg-white dark:bg-[#272729]" delay={0.05}>
               <h3 className="text-card-title text-apple-dark dark:text-white mb-6 tracking-tight">Question Parameters</h3>
               <div className="flex flex-col gap-5">
                 
                 <div>
                    <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Target Exam</label>
                    <div className="relative">
                      <select
                        required
                        className="w-full appearance-none bg-[#f5f5f7] dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-[8px] px-[16px] py-[12px] text-body-standard focus:outline-none focus:border-apple-blue"
                        value={selectedExamId}
                        onChange={e => setSelectedExamId(e.target.value)}
                      >
                        {exams.length === 0 && <option value="">No active exams found</option>}
                        {exams.map(exam => (
                           <option key={exam.id} value={exam.id}>{exam.exam_name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black/50 dark:text-white/50">▼</div>
                    </div>
                 </div>

                 <div>
                    <label className="text-caption text-black/80 dark:text-white/80 mb-1 block">Question Prompt</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full resize-none bg-[#f5f5f7] dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-[8px] px-[16px] py-[12px] text-body-standard focus:outline-none focus:border-apple-blue"
                      placeholder="What is the time complexity of QuickSort?"
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                    />
                 </div>
               </div>
            </Card>

            <Card elevated className="p-8 bg-white dark:bg-[#272729]" delay={0.15}>
               <h3 className="text-card-title text-apple-dark dark:text-white mb-2 tracking-tight">Multiple Choice Options</h3>
               <p className="text-caption text-black/60 dark:text-white/60 mb-6">Provide up to 4 options and select the solitary correct answer.</p>
               
               <div className="flex flex-col gap-4">
                 {options.map((opt, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.06 }}
                      className="flex items-center gap-4"
                    >
                       <motion.button
                         type="button"
                         whileHover={{ scale: 1.15 }}
                         whileTap={{ scale: 0.9 }}
                         onClick={() => handleSetCorrect(index)}
                         className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center shrink-0 transition-colors ${opt.isCorrect ? 'border-apple-blue bg-apple-blue' : 'border-black/20 dark:border-white/20 hover:border-apple-blue/50'}`}
                       >
                         {opt.isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                       </motion.button>
                       <input
                         type="text"
                         required
                         className={`w-full bg-[#f5f5f7] dark:bg-black/20 border transition-colors rounded-[8px] px-[16px] py-[12px] text-body-standard focus:outline-none focus:border-apple-blue ${opt.isCorrect ? 'border-apple-blue/30 bg-apple-blue/5 dark:bg-apple-blue/10 text-apple-blue' : 'border-black/10 dark:border-white/10'}`}
                         placeholder={`Option ${index + 1}`}
                         value={opt.optionText}
                         onChange={e => handleOptionChange(index, e.target.value)}
                       />
                    </motion.div>
                 ))}
               </div>
            </Card>

            <motion.div
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.3 }}
              className="flex justify-end gap-4 mt-4"
            >
              <Button type="button" variant="pill-link" onClick={() => router.push('/teacher/dashboard')}>Done</Button>
              <Button type="submit" variant="primary-blue" disabled={loading || exams.length === 0} className="w-[160px]">
                 {loading ? 'Attaching...' : 'Add to Bank'}
              </Button>
            </motion.div>
          </motion.form>

        </div>
    </div>
  );
}

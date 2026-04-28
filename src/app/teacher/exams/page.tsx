'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { fadeUp, fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/motion';
import { normalizeErrorMessage } from '@/lib/errors';

interface Exam {
  id: string;
  exam_name: string;
  duration_minutes: number;
  total_questions: number;
  live_date: string;
  dead_date: string;
  pin_code: string;
}

export default function ExamManagementPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteExamId, setPendingDeleteExamId] = useState<string | null>(null);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError('You must be authenticated to view exams.');
      return;
    }

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setExams(data);
    } else if (error) {
      setError(normalizeErrorMessage(error, 'Failed to load exams.'));
    }
    setLoading(false);
  };

  const requestDelete = (id: string) => {
    setPendingDeleteExamId(id);
  };

  const handleDelete = async () => {
    if (!pendingDeleteExamId) return;
    setDeletingExamId(pendingDeleteExamId);

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', pendingDeleteExamId);

    if (!error) {
      setExams((prev) => prev.filter((exam) => exam.id !== pendingDeleteExamId));
      showToast({ variant: 'success', title: 'Exam deleted', message: 'Assessment has been removed.' });
    } else {
      showToast({
        variant: 'error',
        title: 'Delete failed',
        message: normalizeErrorMessage(error, 'Failed to delete exam.'),
      });
    }
    setDeletingExamId(null);
    setPendingDeleteExamId(null);
  };

  return (
    <div className="w-full">
        <div className="max-w-[1024px] mx-auto">
          
          <motion.div {...fadeUp} className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
             <div>
               <h1 className="text-[28px] font-display font-bold text-[var(--color-ink)] mb-1 tracking-tight">Assessments.</h1>
               <p className="text-[14px] text-[var(--color-ash)] font-medium">Manage, review, or remove your proctored exams.</p>
             </div>
             <Button variant="primary" onClick={() => router.push('/teacher/create-exam')}>
               New Assessment
             </Button>
          </motion.div>
          <div className="mb-4">
            <FeedbackBanner message={error} variant="error" />
          </div>

          {loading ? (
            <motion.p {...fadeIn} className="text-center text-[13px] text-[var(--color-ash)] font-medium mt-20">Accessing registry...</motion.p>
          ) : exams.length === 0 ? (
            <motion.div {...scaleIn} className="text-center py-20 bg-white rounded-[16px] border border-[var(--color-hairline)] airbnb-card-shadow">
              <p className="text-[15px] text-[var(--color-ash)] font-medium mb-6">No assessments found in your registry.</p>
              <Button variant="pill" onClick={() => router.push('/teacher/create-exam')}>Create your first assessment</Button>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {exams.map((exam, idx) => {
                  const live = new Date(exam.live_date);
                  const isLive = new Date() >= live && new Date() <= new Date(exam.dead_date);

                  return (
                    <motion.div
                      key={exam.id}
                      variants={staggerItem}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      layout
                    >
                      <Card elevated className="flex flex-col h-full bg-white rounded-[16px]" delay={0}>
                        <div className="p-6 flex-grow">
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] px-2 py-1 rounded-[4px] font-bold uppercase tracking-wider ${isLive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-[var(--color-soft-cloud)] text-[var(--color-ash)] border border-[var(--color-hairline)]'}`}>
                              {isLive ? 'Live Now' : 'Off-Session'}
                            </span>
                            <span className="text-[11px] font-bold text-[var(--color-mute)] font-mono uppercase">{exam.duration_minutes}m</span>
                          </div>
                          
                          <h3 className="text-[18px] font-display font-bold text-[var(--color-ink)] mb-1 leading-tight tracking-tight">
                            {exam.exam_name}
                          </h3>
                          <p className="text-[10px] text-[var(--color-ash)] mb-6 font-mono font-bold uppercase tracking-widest">
                             REF: {exam.id.split('-')[0]}
                          </p>
                          
                          <div className="flex justify-between items-center bg-[var(--color-soft-cloud)] border border-[var(--color-hairline)] p-3 rounded-[10px] mb-6">
                            <span className="text-[10px] font-bold text-[var(--color-ash)] uppercase tracking-wider">PIN</span>
                            <span className="text-[16px] font-mono font-bold text-[var(--color-rausch)] tracking-[4px]">{exam.pin_code || '------'}</span>
                          </div>
                          
                          <div className="flex flex-col gap-1.5 mb-2">
                            <div className="flex justify-between items-center text-[12px]">
                               <span className="text-[var(--color-ash)] font-medium">MCQs</span>
                               <span className="text-[var(--color-ink)] font-bold">{exam.total_questions}</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px]">
                               <span className="text-[var(--color-ash)] font-medium">Start Date</span>
                               <span className="text-[var(--color-ink)] font-bold">{live.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-[var(--color-soft-cloud)]/40 flex justify-between items-center border-t border-[var(--color-hairline)]">
                          <Button
                            variant="secondary"
                            className="text-[var(--color-error)] border-[var(--color-error)]/20 hover:bg-red-50 px-4"
                            onClick={() => requestDelete(exam.id)}
                          >
                            Delete
                          </Button>
                          <Button variant="pill" className="px-4" onClick={() => router.push(`/teacher/add-questions?exam=${exam.id}`)}>
                             Edit Content
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

        </div>
        <ConfirmDialog
          open={pendingDeleteExamId !== null}
          title="Delete this exam?"
          description="This will permanently remove the exam, all questions, and all associated student results."
          confirmLabel="Delete exam"
          intent="danger"
          loading={deletingExamId !== null}
          onCancel={() => {
            if (!deletingExamId) setPendingDeleteExamId(null);
          }}
          onConfirm={handleDelete}
        />
    </div>
  );
}

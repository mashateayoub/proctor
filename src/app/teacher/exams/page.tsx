'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setExams(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const confirmation = window.confirm("Are you sure you want to delete this exam? This will cascade and destroy all associated questions and student result data.");
    if (!confirmation) return;

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);

    if (!error) {
      setExams(exams.filter(exam => exam.id !== id));
    }
  };

  return (
    <div className="w-full">
        <div className="max-w-[1024px] mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
             <div>
               <h1 className="text-section-heading text-apple-dark dark:text-white mb-2 tracking-tight">Active Assessments.</h1>
               <p className="text-body-standard text-black/80 dark:text-white/80">Manage, review, or permanently delete your constructed exams.</p>
             </div>
             <Button variant="primary-blue" onClick={() => router.push('/teacher/create-exam')}>
               Create New Exam
             </Button>
          </div>

          {loading ? (
            <p className="text-center text-caption text-black/50 dark:text-white/50 mt-20">Loading registry...</p>
          ) : exams.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-[#1d1d1f] rounded-[8px]">
              <p className="text-body-standard text-black/80 dark:text-white/80 mb-4">No exams found under your registry.</p>
              <Button variant="pill-link" onClick={() => router.push('/teacher/create-exam')}>Create your first assessment</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map(exam => {
                const live = new Date(exam.live_date);
                const isLive = new Date() >= live && new Date() <= new Date(exam.dead_date);

                return (
                  <Card key={exam.id} elevated className="flex flex-col h-full bg-white dark:bg-[#272729]">
                    <div className="p-8 flex-grow">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-[12px] px-2 py-1 rounded-[4px] font-semibold tracking-tight ${isLive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60'}`}>
                          {isLive ? 'Active' : 'Scheduled / Ended'}
                        </span>
                        <span className="text-caption font-semibold text-black/40">{exam.duration_minutes}m</span>
                      </div>
                      
                      <h3 className="text-[21px] font-bold text-apple-dark dark:text-white mb-2 leading-tight tracking-tight">
                        {exam.exam_name}
                      </h3>
                      <p className="text-caption text-black/60 dark:text-white/60 mb-6 font-mono text-[11px]">
                         ID: {exam.id.split('-')[0]}
                      </p>
                      
                      <div className="flex justify-between items-center bg-apple-gray dark:bg-black/50 border border-black/10 dark:border-white/10 p-3 rounded-[8px] mb-6">
                        <span className="text-[11px] font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Access PIN</span>
                        <span className="text-[16px] font-mono font-bold text-apple-blue tracking-[4px]">{exam.pin_code || '------'}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1 mb-6">
                        <p className="text-caption text-black/80 dark:text-white/80">
                          <span className="opacity-60">Questions:</span> {exam.total_questions}
                        </p>
                        <p className="text-caption text-black/80 dark:text-white/80">
                          <span className="opacity-60">Live:</span> {live.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-8 pt-0 flex justify-between items-center mt-auto border-t border-black/5 dark:border-white/5 pt-4">
                      <Button variant="pill-link" className="text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(exam.id)}>
                        Delete
                      </Button>
                      <Button variant="filter" onClick={() => router.push(`/teacher/add-questions?exam=${exam.id}`)}>
                         Add Content
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
    </div>
  );
}

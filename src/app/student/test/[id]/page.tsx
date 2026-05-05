'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { GlassNav } from '@/components/ui/Navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ExamInstructionsPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [certified, setCertified] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      const { data } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      
      setExam(data);
      setLoading(false);
    };
    if (examId) fetchExam();
  }, [examId, supabase]);

  if (loading) return <div className="min-h-screen bg-[var(--color-soft-cloud)] pt-32 text-center text-[var(--color-ink)] font-medium">Initializing secure layer...</div>;
  if (!exam) return <div className="min-h-screen bg-[var(--color-soft-cloud)] pt-32 text-center text-[var(--color-ink)] font-medium">Assessment not found.</div>;

  return (
    <>
      <GlassNav 
        logoText="AiProctor Student"
        links={[{label: 'Dashboard', href: '/student/dashboard'}]} 
      />

      <main className="bg-[var(--color-soft-cloud)] min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-[800px] mx-auto">
          
          <div className="mb-6 text-center">
             <h1 className="text-display-hero text-[var(--color-ink)] mb-3">
               {exam.exam_name}
             </h1>
             <p className="text-[15px] text-[var(--color-ash)] font-medium max-w-[600px] mx-auto">
               Review the testing protocol below before initializing the proctoring engine.
             </p>
          </div>

          <Card elevated className="bg-white p-6 mb-8 rounded-[16px]">
             <div className="flex flex-col gap-6 text-[14px] text-[var(--color-ink)] font-medium">
                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-[var(--color-hairline)]">
                   <div>
                     <span className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider block mb-1">Time Limit</span>
                     <span className="font-display font-bold text-[20px]">{exam.duration_minutes} Minutes</span>
                   </div>
                   <div>
                     <span className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider block mb-1">Total Questions</span>
                     <span className="font-display font-bold text-[20px]">
                       {exam.environment_mode === 'terminal_lab'
                         ? `${exam.total_questions} MCQs + Linux Lab`
                         : exam.environment_mode === 'hybrid'
                           ? `${exam.total_questions} MCQs + Coding + Linux Lab`
                           : `${exam.total_questions} MCQs + Coding`}
                     </span>
                   </div>
                </div>

                <div className="rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-soft-cloud)]/50 p-3">
                  <span className="text-[11px] font-bold text-[var(--color-ash)] uppercase tracking-wider block mb-1">
                    Runtime Environment
                  </span>
                  <p className="text-[13px] text-[var(--color-ink)] font-semibold">
                    {exam.environment_mode || 'standard'}
                  </p>
                </div>

                <div>
                  <h3 className="text-[18px] font-display font-bold mb-4 tracking-tight">Academic Integrity Protocol</h3>
                  <ul className="list-disc pl-5 flex flex-col gap-3 text-[var(--color-ash)]">
                     <li>You must remain in the camera frame for the entire duration of the assessment.</li>
                     <li>Multiple persons detected in the frame will instantly flag the session.</li>
                     <li>Use of cellular devices or prohibited electronics is strictly forbidden and actively tracked.</li>
                     <li>The timer cannot be paused once initiated. If you disconnect, the timer continues.</li>
                     <li><strong>The exam runs in fullscreen mode.</strong> Exiting fullscreen will be logged as a violation.</li>
                     <li>Switching tabs, copy/paste, right-click, DevTools, and PrintScreen are <strong>blocked and recorded</strong>.</li>
                  </ul>
                </div>
             </div>
          </Card>

          <div className="flex flex-col items-center gap-6">
             <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded-[4px] border-[var(--color-hairline)] accent-[var(--color-rausch)]"
                  checked={certified}
                  onChange={(e) => setCertified(e.target.checked)}
                />
                <span className="text-[13px] text-[var(--color-ash)] select-none font-medium group-hover:text-[var(--color-ink)] transition-colors">
                  I certify I have read the protocol and agree to active webcam proctoring.
                </span>
             </label>

             <Button 
               variant="primary" 
               className="w-full max-w-[280px]" 
               disabled={!certified}
               onClick={() => router.push(`/exam/${examId}`)}
             >
               Initialize Exam
             </Button>
          </div>

        </div>
      </main>
    </>
  );
}

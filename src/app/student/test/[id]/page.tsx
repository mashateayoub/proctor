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

  if (loading) return <div className="min-h-screen bg-apple-gray dark:bg-black pt-32 text-center text-apple-dark dark:text-white">Authenticating schema...</div>;
  if (!exam) return <div className="min-h-screen bg-apple-gray dark:bg-black pt-32 text-center text-apple-dark dark:text-white">Exam not found.</div>;

  return (
    <>
      <GlassNav 
        logoText="AiProctor Student"
        links={[{label: 'Dashboard', href: '/student/dashboard'}]} 
      />

      <main className="bg-apple-gray dark:bg-black min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-[800px] mx-auto">
          
          <div className="mb-10 text-center">
             <h1 className="text-display-hero text-apple-dark dark:text-white mb-4 tracking-tight leading-none text-[48px]">
               {exam.exam_name}
             </h1>
             <p className="text-body-standard text-black/60 dark:text-white/60">
               Please review the testing protocol below before initializing the proctoring engine.
             </p>
          </div>

          <Card elevated className="bg-white dark:bg-[#1d1d1f] p-10 mb-8">
             <div className="flex flex-col gap-6 text-body-standard text-apple-dark dark:text-white">
                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-black/10 dark:border-white/10">
                   <div>
                     <span className="text-caption text-black/50 dark:text-white/50 block mb-1">Time Limit</span>
                     <span className="font-semibold text-[21px]">{exam.duration_minutes} Minutes</span>
                   </div>
                   <div>
                     <span className="text-caption text-black/50 dark:text-white/50 block mb-1">Total Questions</span>
                     <span className="font-semibold text-[21px]">{exam.total_questions} MCQs + 1 Coding</span>
                   </div>
                </div>

                <div>
                  <h3 className="text-card-title mb-4">Academic Integrity Rules</h3>
                  <ul className="list-disc pl-5 flex flex-col gap-3 text-black/80 dark:text-white/80">
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
             <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded-[4px] border-black/20 accent-[#0071e3]"
                  checked={certified}
                  onChange={(e) => setCertified(e.target.checked)}
                />
                <span className="text-caption text-black/80 dark:text-white/80 select-none">
                  I certify I have read the protocol and agree to active webcam proctoring.
                </span>
             </label>

             <Button 
               variant="primary-blue" 
               className="w-full max-w-[300px] h-[56px] text-[18px]" 
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

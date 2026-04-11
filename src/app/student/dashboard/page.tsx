'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ProctorCamera from '@/components/ProctorCamera';

interface UnlockedExam {
  id: string;
  exam_name: string;
  duration_minutes: number;
  total_questions: number;
  live_date: string;
  dead_date: string;
  teacher_name?: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockedExam, setUnlockedExam] = useState<UnlockedExam | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) return;
    setLoading(true);
    setError(null);

    const cleanPin = pinCode.trim().toUpperCase();

    const { data, error: fetchError } = await supabase
      .from('exams')
      .select(`
        id, exam_name, duration_minutes, total_questions, live_date, dead_date,
        users!teacher_id ( name )
      `)
      .eq('pin_code', cleanPin)
      .single();

    if (fetchError || !data) {
      setError("Invalid PIN code. Please check with your instructor.");
      setUnlockedExam(null);
    } else {
      setUnlockedExam({
        ...data,
        teacher_name: (data.users as any)?.name || 'Instructor'
      });
    }
    setLoading(false);
  };

  const isExamLive = (dateStart: string, dateEnd: string) => {
    const now = new Date();
    return now >= new Date(dateStart) && now <= new Date(dateEnd);
  };
  
  const isExamMissed = (dateEnd: string) => {
    const now = new Date();
    return now > new Date(dateEnd);
  };

  return (
    <div className="w-full">
      {/* Cinematic Hero Block */}
      <section className="w-full bg-apple-gray dark:bg-black py-24 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-display-hero text-apple-dark dark:text-white max-w-[800px] mb-4">
          Access Gateway.
        </h1>
        <p className="text-body-standard text-black/80 dark:text-white/80 max-w-[600px] mb-10">
          Enter the secure PIN code provided by your instructor to unlock and initialize your proctored assessment.
        </p>
        
        {/* PIN Entry Form */}
        <form onSubmit={handleUnlock} className="flex flex-col md:flex-row gap-4 items-center justify-center max-w-[500px] w-full">
           <input 
             type="text" 
             placeholder="ENTER PIN (e.g. A9F2K1)" 
             value={pinCode}
             onChange={(e) => setPinCode(e.target.value.toUpperCase())}
             maxLength={6}
             className="w-full bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-[12px] px-[24px] py-[16px] text-[18px] font-mono font-bold tracking-[4px] text-center focus:outline-none focus:border-apple-blue shadow-sm text-apple-dark dark:text-white"
           />
           <Button type="submit" variant="primary-blue" disabled={loading} className="py-[16px] px-[32px] whitespace-nowrap h-full min-h-[58px]">
             {loading ? 'Verifying...' : 'Unlock'}
           </Button>
        </form>
        {error && <p className="text-red-500 font-semibold mt-4 text-[14px]">{error}</p>}
      </section>

      {/* Available Exams Section */}
      {unlockedExam && (
        <section className="w-full bg-white dark:bg-[#1d1d1f] py-24 px-6 border-t border-black/5 dark:border-white/5">
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-section-heading text-apple-dark dark:text-white mb-12 text-center">
              Assessment Unlocked.
            </h2>
            
            <Card elevated className="flex flex-col overflow-hidden bg-[#f5f5f7] dark:bg-[#272729]">
              <div className="p-10">
                <span className="text-caption font-semibold text-apple-blue mb-2 block">{unlockedExam.teacher_name}</span>
                <h3 className="text-card-title text-apple-dark dark:text-white mb-4">{unlockedExam.exam_name}</h3>
                <div className="flex flex-col gap-2 mb-6">
                  <p className="text-body-standard text-black/80 dark:text-white/80 font-mono text-[12px]">
                    <span className="opacity-50">DURATION: </span>{unlockedExam.duration_minutes} Minutes
                  </p>
                  <p className="text-body-standard text-black/80 dark:text-white/80 font-mono text-[12px]">
                    <span className="opacity-50">QUESTIONS: </span>{unlockedExam.total_questions}
                  </p>
                  <p className="text-body-standard text-black/80 dark:text-white/80 font-mono text-[12px]">
                    <span className="opacity-50">DEADLINE: </span>{new Date(unlockedExam.dead_date).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="p-8 bg-apple-gray dark:bg-black/20 flex flex-col items-center border-t border-black/5 dark:border-white/5">
                 {isExamMissed(unlockedExam.dead_date) ? (
                    <div className="w-full text-center">
                       <Button variant="filter" disabled className="w-full opacity-50 cursor-not-allowed text-black/50 dark:text-white/50">
                          Deadline Passed
                       </Button>
                       <p className="text-[12px] text-red-500 font-semibold mt-4">You can no longer start this exam.</p>
                    </div>
                 ) : !isExamLive(unlockedExam.live_date, unlockedExam.dead_date) ? (
                    <div className="w-full text-center">
                       <Button variant="filter" disabled className="w-full opacity-50 cursor-not-allowed text-black/50 dark:text-white/50">
                          Not Live Yet
                       </Button>
                       <p className="text-[12px] text-black/50 dark:text-white/50 mt-4 font-semibold">Opens: {new Date(unlockedExam.live_date).toLocaleString()}</p>
                    </div>
                 ) : (
                    <Button 
                      variant="primary-blue" 
                      onClick={() => router.push(`/student/test/${unlockedExam.id}`)}
                      className="w-full max-w-[300px] py-4 text-[16px]"
                    >
                      Initialize Secure Session
                    </Button>
                 )}
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Proctoring Pre-Warm */}
      <section className="w-full bg-apple-gray dark:bg-black py-24 px-6 border-t border-black/5 dark:border-white/5">
        <div className="max-w-[980px] mx-auto">
          <h2 className="text-section-heading text-apple-dark dark:text-white mb-12 text-center">
            System Check.
          </h2>
          <div className="flex justify-center">
            <div className="rounded-[12px] overflow-hidden border-[4px] border-[#1d1d1f] dark:border-white shadow-[0_5px_30px_0_rgba(0,0,0,0.22)] w-full max-w-[640px]">
              <ProctorCamera />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

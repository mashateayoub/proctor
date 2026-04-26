'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ProctorCamera from '@/components/ProctorCamera';
import { fadeUp, fadeIn, scaleIn } from '@/lib/motion';

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
      <section className="w-full rounded-[16px] border border-[var(--color-hairline)] bg-white px-6 py-12 text-center airbnb-card-shadow">
        <motion.p {...fadeIn} className="mb-2 text-[11px] font-bold tracking-[0.2em] text-[var(--color-rausch)] uppercase">
          Student Gateway
        </motion.p>
        <motion.h1 {...fadeUp} className="text-[32px] md:text-[40px] font-display font-bold text-[var(--color-ink)] tracking-tight mb-3">
          Enter assessment.
        </motion.h1>
        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="text-[15px] text-[var(--color-ash)] max-w-[550px] mx-auto mb-8 font-medium leading-relaxed"
        >
          Initialize your secure proctoring session by entering the 6-digit PIN provided by your instructor.
        </motion.p>
        
        <motion.form
          {...fadeIn}
          transition={{ ...fadeIn.transition, delay: 0.25 }}
          onSubmit={handleUnlock}
          className="flex flex-col md:flex-row gap-3 items-center justify-center max-w-[440px] mx-auto w-full"
        >
           <motion.input
             whileFocus={{ scale: 1.01, borderColor: '#ff385c' }}
             transition={{ type: 'spring', stiffness: 400, damping: 30 }}
             type="text" 
             placeholder="PIN CODE" 
             value={pinCode}
             onChange={(e) => setPinCode(e.target.value.toUpperCase())}
             maxLength={6}
             className="w-full bg-white border border-[var(--color-hairline)] rounded-[10px] px-4 py-3 text-[18px] font-mono font-bold tracking-[6px] text-center focus:outline-none focus:border-[var(--color-rausch)] shadow-sm text-[var(--color-ink)]"
           />
           <Button type="submit" variant="primary" disabled={loading} className="w-full md:w-auto px-8">
             {loading ? 'Verifying...' : 'Unlock'}
           </Button>
        </motion.form>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-[var(--color-error)] font-bold mt-4 text-[13px]"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Available Exams Section */}
      <AnimatePresence>
        {unlockedExam && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full bg-white py-12 px-6 border-t border-[var(--color-hairline)]"
          >
            <div className="max-w-[600px] mx-auto">
              <motion.h2
                {...fadeUp}
                className="text-[24px] font-display font-bold text-[var(--color-ink)] mb-8 text-center"
              >
                Assessment Ready.
              </motion.h2>
              
              <Card elevated className="flex flex-col overflow-hidden bg-[var(--color-soft-cloud)] rounded-[16px]" delay={0.2}>
                <div className="p-6">
                  <span className="text-[11px] font-bold text-[var(--color-rausch)] uppercase tracking-wider mb-1 block">{unlockedExam.teacher_name}</span>
                  <h3 className="text-[20px] font-display font-bold text-[var(--color-ink)] mb-4">{unlockedExam.exam_name}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--color-mute)] uppercase">Duration</span>
                      <span className="text-[14px] font-bold text-[var(--color-ink)]">{unlockedExam.duration_minutes}m</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--color-mute)] uppercase">Questions</span>
                      <span className="text-[14px] font-bold text-[var(--color-ink)]">{unlockedExam.total_questions}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--color-mute)] uppercase">Deadline</span>
                      <span className="text-[14px] font-bold text-[var(--color-ink)]">{new Date(unlockedExam.dead_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-[var(--color-hairline)]/20 flex flex-col items-center border-t border-[var(--color-hairline)]">
                   {isExamMissed(unlockedExam.dead_date) ? (
                      <div className="w-full text-center">
                         <Button variant="pill" disabled className="w-full opacity-50">Deadline Passed</Button>
                      </div>
                   ) : !isExamLive(unlockedExam.live_date, unlockedExam.dead_date) ? (
                      <div className="w-full text-center">
                         <Button variant="pill" disabled className="w-full opacity-50">Not Live Yet</Button>
                         <p className="text-[11px] text-[var(--color-ash)] mt-2 font-bold">Opens: {new Date(unlockedExam.live_date).toLocaleString()}</p>
                      </div>
                   ) : (
                      <Button 
                        variant="primary" 
                        onClick={() => router.push(`/student/test/${unlockedExam.id}`)}
                        className="w-full max-w-[280px]"
                      >
                        Start Assessment
                      </Button>
                   )}
                </div>
              </Card>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Proctoring Pre-Warm */}
      <section className="w-full bg-[var(--color-soft-cloud)] py-12 px-6 border-t border-[var(--color-hairline)]">
        <div className="max-w-[800px] mx-auto text-center">
          <motion.h2
            {...fadeUp}
            className="text-[20px] font-display font-bold text-[var(--color-ink)] mb-8"
          >
            Camera verification.
          </motion.h2>
          <motion.div
            {...scaleIn}
            className="flex justify-center"
          >
            <div className="w-full max-w-[500px] overflow-hidden rounded-[16px] border border-[var(--color-hairline)] bg-white p-2 airbnb-card-shadow">
              <ProctorCamera />
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}

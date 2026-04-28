'use client';

import { useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeedbackBanner } from '@/components/ui/FeedbackBanner';
import ProctorCamera from '@/components/ProctorCamera';
import { CameraDiagnostics } from '@/components/ui/CameraDiagnostics';
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

function getExamStatus(exam: UnlockedExam) {
  const now = new Date();
  const liveAt = new Date(exam.live_date);
  const deadAt = new Date(exam.dead_date);

  if (now > deadAt) {
    return { state: 'missed' as const, label: 'Deadline Passed' };
  }
  if (now < liveAt) {
    return { state: 'upcoming' as const, label: 'Not Live Yet' };
  }
  return { state: 'live' as const, label: 'Live Now' };
}

export default function StudentDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockedExam, setUnlockedExam] = useState<UnlockedExam | null>(null);
  const [recentUnlockedExams, setRecentUnlockedExams] = useState<UnlockedExam[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const activeStatus = useMemo(
    () => (unlockedExam ? getExamStatus(unlockedExam) : null),
    [unlockedExam],
  );

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
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
      setError('Invalid PIN code. Please check with your instructor.');
      setUnlockedExam(null);
      setLoading(false);
      return;
    }

    const nextExam: UnlockedExam = {
      ...data,
      teacher_name: ((data.users as { name?: string } | null)?.name || 'Instructor') as string,
    };

    setUnlockedExam(nextExam);
    setRecentUnlockedExams((prev) => {
      const deduped = prev.filter((exam) => exam.id !== nextExam.id);
      return [nextExam, ...deduped].slice(0, 4);
    });
    setLoading(false);
  };

  return (
    <div className="w-full">
      <motion.div {...fadeUp} className="mb-7 flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rausch">Student Command Center</p>
        <h1 className="text-section-heading tracking-tight text-ink">Assessment Access.</h1>
        <p className="max-w-[720px] text-body-standard text-ash">
          Unlock an exam with your PIN, verify readiness, and launch directly into your secure test environment.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col gap-6">
          <Card elevated className="rounded-[12px] bg-white p-5 md:p-6" delay={0}>
            <h2 className="text-card-title text-ink">Unlock Exam</h2>
            <p className="mt-1 text-[12px] font-medium text-ash">
              Enter the 6-character PIN shared by your instructor.
            </p>

            <form onSubmit={handleUnlock} className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                placeholder="PIN CODE"
                maxLength={6}
                className="h-10 w-full rounded-[10px] border border-hairline bg-white px-4 text-center font-mono text-[16px] font-bold tracking-[5px] text-ink outline-none transition-colors focus:border-rausch"
              />
              <Button type="submit" variant="primary" disabled={loading} className="h-10 min-w-[130px]">
                {loading ? 'Verifying...' : 'Unlock'}
              </Button>
            </form>

            <div className="mt-3">
              <FeedbackBanner message={error} variant="error" />
            </div>
          </Card>

          <Card elevated className="rounded-[12px] bg-white p-5 md:p-6" delay={0.03}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-card-title text-ink">Active Exam</h2>
              {activeStatus && (
                <span
                  className={`inline-flex h-6 items-center rounded-[999px] px-2.5 text-[10px] font-semibold uppercase tracking-wide ${
                    activeStatus.state === 'live'
                      ? 'bg-emerald-100 text-emerald-700'
                      : activeStatus.state === 'upcoming'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {activeStatus.label}
                </span>
              )}
            </div>

            {!unlockedExam ? (
              <div className="rounded-[10px] border border-dashed border-hairline bg-soft-cloud/35 p-5 text-center">
                <p className="text-[13px] font-medium text-ash">
                  No exam unlocked yet. Enter a valid PIN to load assessment details.
                </p>
              </div>
            ) : (
              <motion.div {...fadeIn} className="rounded-[10px] border border-hairline bg-soft-cloud/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rausch">
                  {unlockedExam.teacher_name}
                </p>
                <h3 className="mt-1 text-[19px] font-bold tracking-tight text-ink">{unlockedExam.exam_name}</h3>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Duration</p>
                    <p className="text-[13px] font-semibold text-ink">{unlockedExam.duration_minutes}m</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Questions</p>
                    <p className="text-[13px] font-semibold text-ink">{unlockedExam.total_questions}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">Deadline</p>
                    <p className="text-[13px] font-semibold text-ink">
                      {new Date(unlockedExam.dead_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-hairline pt-4">
                  {activeStatus?.state === 'missed' ? (
                    <Button variant="pill" disabled className="w-full opacity-55">
                      Deadline Passed
                    </Button>
                  ) : activeStatus?.state === 'upcoming' ? (
                    <div className="flex flex-col gap-2">
                      <Button variant="pill" disabled className="w-full opacity-55">
                        Not Live Yet
                      </Button>
                      <p className="text-center text-[11px] font-semibold text-ash">
                        Opens: {new Date(unlockedExam.live_date).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => router.push(`/student/test/${unlockedExam.id}`)}
                    >
                      Start Assessment
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </Card>

          <Card elevated className="rounded-[12px] bg-white p-5 md:p-6" delay={0.06}>
            <h2 className="text-card-title text-ink">Recently Unlocked</h2>
            <p className="mt-1 text-[12px] font-medium text-ash">Quickly switch between exams unlocked in this session.</p>
            {recentUnlockedExams.length === 0 ? (
              <p className="mt-4 rounded-[10px] border border-dashed border-hairline bg-soft-cloud/35 p-4 text-[12px] font-medium text-ash">
                No recent unlocks yet.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-2">
                {recentUnlockedExams.map((exam) => {
                  const status = getExamStatus(exam);
                  return (
                    <button
                      type="button"
                      key={exam.id}
                      onClick={() => setUnlockedExam(exam)}
                      className="flex items-center justify-between rounded-[9px] border border-hairline bg-soft-cloud/35 px-3 py-2 text-left transition-colors hover:border-rausch/40"
                    >
                      <div>
                        <p className="text-[12px] font-semibold text-ink">{exam.exam_name}</p>
                        <p className="text-[11px] text-ash">{exam.teacher_name}</p>
                      </div>
                      <span
                        className={`rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          status.state === 'live'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status.state === 'upcoming'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {status.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card elevated className="rounded-[12px] bg-white p-5 md:p-6" delay={0.02}>
            <h2 className="text-card-title text-ink">Readiness</h2>
            <p className="mt-1 text-[12px] font-medium text-ash">
              Confirm camera visibility and environment readiness before starting.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <div className="rounded-[8px] border border-hairline bg-soft-cloud/35 px-3 py-2 text-[12px] font-medium text-ink">
                Camera permissions required
              </div>
              <div className="rounded-[8px] border border-hairline bg-soft-cloud/35 px-3 py-2 text-[12px] font-medium text-ink">
                Quiet and stable environment recommended
              </div>
              <div className="rounded-[8px] border border-hairline bg-soft-cloud/35 px-3 py-2 text-[12px] font-medium text-ink">
                Fullscreen and anti-cheat checks during test
              </div>
            </div>
          </Card>

          <Card elevated className="rounded-[12px] bg-white p-4" delay={0.05}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-card-title text-ink">Camera Widget</h2>
              <span className="rounded-[6px] bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                Ready Check
              </span>
            </div>
            <motion.div {...scaleIn} className="overflow-hidden rounded-[12px] border border-hairline bg-soft-cloud/30 p-2">
              <ProctorCamera onStreamChange={setCameraStream} />
            </motion.div>
            <div className="mt-3">
              <CameraDiagnostics stream={cameraStream} compact />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

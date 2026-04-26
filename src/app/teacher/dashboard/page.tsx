'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeUp, fadeIn } from '@/lib/motion';

export default function TeacherDashboard() {
  const router = useRouter();

  return (
    <div className="w-full">
        <section className="w-full rounded-[20px] border border-hairline bg-white px-6 py-10 text-center airbnb-card-shadow">
          <motion.p {...fadeIn} className="mb-3 text-[12px] font-bold tracking-[0.32px] text-rausch">
            TEACHER WORKSPACE
          </motion.p>
          <motion.h1
            {...fadeUp}
            className="text-display-hero mx-auto max-w-[800px] text-ink mb-4"
          >
            Proctoring, perfected.
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="text-body-standard text-ash max-w-[600px] mx-auto mb-10"
          >
            Manage your exams. Review anomalies in real-time. Everything you need to maintain academic integrity.
          </motion.p>
          <motion.div
            {...fadeIn}
            transition={{ ...fadeIn.transition, delay: 0.3 }}
            className="flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Button variant="primary-blue" onClick={() => router.push('/teacher/create-exam')}>Create new exam</Button>
            <Button variant="pill-link" onClick={() => router.push('/teacher/analytics')}>View cheating logs</Button>
          </motion.div>
        </section>
    </div>
  );
}

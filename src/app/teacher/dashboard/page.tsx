'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeUp, fadeIn } from '@/lib/motion';

export default function TeacherDashboard() {
  const router = useRouter();

  return (
    <div className="w-full">
        <section className="w-full rounded-[16px] border border-[var(--color-hairline)] bg-white px-6 py-12 text-center airbnb-card-shadow">
          <motion.p {...fadeIn} className="mb-2 text-[11px] font-bold tracking-[0.2em] text-[var(--color-rausch)] uppercase">
            Teacher Workspace
          </motion.p>
          <motion.h1
            {...fadeUp}
            className="text-[32px] md:text-[40px] font-display font-bold text-[var(--color-ink)] tracking-tight leading-tight mx-auto max-w-[800px] mb-3"
          >
            Integrity, simplified.
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="text-[15px] text-[var(--color-ash)] max-w-[550px] mx-auto mb-8 font-medium leading-relaxed"
          >
            Manage assessments and review live anomalies. Your central command for maintaining academic standards.
          </motion.p>
          <motion.div
            {...fadeIn}
            transition={{ ...fadeIn.transition, delay: 0.3 }}
            className="flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Button variant="primary" onClick={() => router.push('/teacher/create-exam')}>Create new exam</Button>
            <Button variant="pill" onClick={() => router.push('/teacher/analytics')}>View analytics</Button>
          </motion.div>
        </section>
    </div>
  );
}

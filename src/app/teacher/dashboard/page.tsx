'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeUp, fadeIn, staggerContainer, staggerItem } from '@/lib/motion';

export default function TeacherDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className="w-full">
        {/* Cinematic Hero Block */}
        <section className="w-full bg-apple-gray dark:bg-black py-24 flex flex-col items-center justify-center text-center px-6">
          <motion.h1
            {...fadeUp}
            className="text-display-hero text-apple-dark dark:text-white max-w-[800px] mb-4"
          >
            Proctoring, perfected.
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.12 }}
            className="text-body-standard text-black/80 dark:text-white/80 max-w-[600px] mb-10"
          >
            Manage your exams. Review anomalies in real-time. Everything you need to maintain academic integrity.
          </motion.p>
          <motion.div
            {...fadeIn}
            transition={{ ...fadeIn.transition, delay: 0.3 }}
            className="flex gap-4"
          >
            <Button variant="primary-blue" onClick={() => router.push('/teacher/create-exam')}>Create new exam</Button>
            <Button variant="pill-link" onClick={() => router.push('/teacher/analytics')}>View cheating logs {'>'}</Button>
          </motion.div>
        </section>
    </div>
  );
}

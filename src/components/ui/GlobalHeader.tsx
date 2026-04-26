'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { fadeIn } from '@/lib/motion';

export function GlobalHeader() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
      className="h-20 flex-shrink-0 border-b border-[var(--color-hairline)] bg-white px-5 sm:px-8 flex items-center justify-between"
    >
       <motion.div {...fadeIn} className="flex items-center gap-3 text-[13px] font-semibold text-[var(--color-ash)] uppercase tracking-wide">
          <span className="h-6 w-6 rounded-full bg-[var(--color-soft-cloud)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-rausch)] text-[10px]">●</span>
          Proctoring session isolated
       </motion.div>
       <div>
          <Button variant="pill" onClick={handleLogout} className="h-9 px-4 text-[12px]">Sign Out</Button>
       </div>
    </motion.header>
  );
}

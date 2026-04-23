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
      className="h-[60px] border-b border-black/10 dark:border-white/10 flex items-center justify-between px-8 bg-white dark:bg-black flex-shrink-0"
    >
       <motion.div {...fadeIn} className="text-[14px] font-medium text-black/60 dark:text-white/60">
          Proctoring Session Isolated
       </motion.div>
       <div>
          <Button variant="pill-link" onClick={handleLogout} className="py-1 px-4 text-[12px]">Sign Out</Button>
       </div>
    </motion.header>
  );
}

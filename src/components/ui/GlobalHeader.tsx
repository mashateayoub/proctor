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
      className="h-20 flex-shrink-0 border-b border-hairline bg-white px-5 sm:px-8 flex items-center justify-between"
    >
       <motion.div {...fadeIn} className="flex items-center gap-3 text-[14px] font-medium text-ash">
          <span className="h-8 w-8 rounded-full bg-soft-cloud border border-hairline flex items-center justify-center text-rausch">●</span>
          Proctoring session isolated
       </motion.div>
       <div>
          <Button variant="pill-link" onClick={handleLogout} className="min-h-9 px-4 py-1 text-[12px]">Sign Out</Button>
       </div>
    </motion.header>
  );
}

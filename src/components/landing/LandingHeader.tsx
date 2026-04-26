'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeIn } from '@/lib/motion';

export function LandingHeader() {
  const router = useRouter();

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 max-w-[1440px] mx-auto">
      <motion.div {...fadeIn} className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
        <div className="w-8 h-8 rounded-full bg-[var(--color-rausch)] flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full" />
        </div>
        <span className="font-bold text-[var(--color-ink)] text-[20px] tracking-tight font-display">AiProctor</span>
      </motion.div>
      
      <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="flex items-center gap-4">
        <Button variant="pill" onClick={() => router.push('/auth/login')}>Log In</Button>
        <Button variant="primary" onClick={() => router.push('/auth/register')}>Get Started</Button>
      </motion.div>
    </header>
  );
}

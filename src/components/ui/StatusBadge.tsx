'use client';

import { motion } from 'framer-motion';

type TakeStatus = 'in_progress' | 'completed';

interface StatusBadgeProps {
  status: TakeStatus | string | null | undefined;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalizedStatus: TakeStatus = status === 'in_progress' ? 'in_progress' : 'completed';

  if (normalizedStatus === 'in_progress') {
    return (
      <span
        className={`inline-flex h-7 items-center gap-2 rounded-full bg-amber-50 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 ${className}`}
      >
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-amber-500"
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.95, 1.15, 0.95] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        In Progress
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-7 items-center gap-2 rounded-full bg-emerald-50 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 ${className}`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      Completed
    </span>
  );
}


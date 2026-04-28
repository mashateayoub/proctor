'use client';

import { motion } from 'framer-motion';
import { overlayVariants } from '@/lib/motion';
import type { ReactNode } from 'react';

interface ReportDrawerShellProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ReportDrawerShell({
  title,
  subtitle,
  open,
  onClose,
  children,
}: ReportDrawerShellProps) {
  if (!open) return null;

  return (
    <motion.div
      {...overlayVariants}
      className="fixed inset-0 z-[105] flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 48, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full w-full max-w-[680px] border-l border-hairline bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-hairline px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[11px] font-medium text-ash">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-soft-cloud text-ink transition-colors hover:bg-soft-cloud/70"
                aria-label="Close report"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-soft-cloud/35 p-4">{children}</div>
        </div>
      </motion.aside>
    </motion.div>
  );
}

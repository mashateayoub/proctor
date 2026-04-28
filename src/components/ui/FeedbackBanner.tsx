'use client';

import { AnimatePresence, motion } from 'framer-motion';

type FeedbackVariant = 'error' | 'success' | 'warning' | 'info';

interface FeedbackBannerProps {
  message: string | null;
  variant?: FeedbackVariant;
  className?: string;
  onDismiss?: () => void;
  compact?: boolean;
}

const variantStyles: Record<FeedbackVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

export function FeedbackBanner({
  message,
  variant = 'info',
  className = '',
  onDismiss,
  compact = false,
}: FeedbackBannerProps) {
  return (
    <AnimatePresence mode="wait">
      {message ? (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className={`flex items-start justify-between gap-3 rounded-[8px] border px-3 ${
            compact ? 'py-2 text-[12px]' : 'py-2.5 text-[12px]'
          } font-semibold ${variantStyles[variant]} ${className}`}
          role={variant === 'error' ? 'alert' : 'status'}
          aria-live={variant === 'error' ? 'assertive' : 'polite'}
        >
          <span>{message}</span>
          {onDismiss && (
            <button
              type="button"
              className="rounded p-0.5 text-[11px] leading-none opacity-70 transition-opacity hover:opacity-100"
              onClick={onDismiss}
              aria-label="Dismiss feedback"
            >
              ✕
            </button>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

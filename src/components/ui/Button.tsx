'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'pill' | 'tab' | 'icon';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  let baseStyles = 'inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] disabled:pointer-events-none disabled:opacity-50 font-sans';

  switch (variant) {
    case 'primary':
      baseStyles += ' bg-[var(--color-rausch)] text-white h-[48px] px-6 rounded-[8px] text-[16px] font-bold hover:bg-[var(--color-deep-rausch)]';
      break;
    case 'secondary':
      baseStyles += ' bg-[var(--color-ink)] text-white h-[48px] px-6 rounded-[8px] text-[16px] font-bold hover:bg-[var(--color-charcoal)]';
      break;
    case 'pill':
      baseStyles += ' bg-white text-[var(--color-ink)] h-[40px] px-4 rounded-[20px] border border-[var(--color-hairline)] text-[14px] font-semibold hover:border-[var(--color-ink)]';
      break;
    case 'tab':
      baseStyles += ' bg-transparent text-[var(--color-ash)] h-[40px] px-4 rounded-[8px] text-[14px] font-semibold hover:bg-black/5 hover:text-[var(--color-ink)]';
      break;
    case 'icon':
      baseStyles += ' h-[40px] w-[40px] rounded-full bg-white text-[var(--color-ink)] border border-[var(--color-hairline)] p-0 hover:border-[var(--color-ink)] shadow-sm';
      break;
  }

  return (
    <motion.button
      className={`${baseStyles} ${className}`}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

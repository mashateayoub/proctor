'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { tapSpring } from '@/lib/motion';

type ButtonVariant = 'primary-blue' | 'primary-dark' | 'pill-link' | 'filter' | 'media-control';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export function Button({ variant = 'primary-blue', children, className = '', ...props }: ButtonProps) {
  let baseStyles = 'inline-flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50';

  switch (variant) {
    case 'primary-blue':
      baseStyles += ' bg-rausch text-white px-6 py-3.5 rounded-[8px] border border-transparent text-[16px] font-medium leading-[1.25] hover:bg-deep-rausch active:scale-[0.92]';
      break;
    case 'primary-dark':
      baseStyles += ' bg-ink text-white px-6 py-3.5 rounded-[8px] text-[16px] font-medium leading-[1.25] hover:bg-charcoal active:scale-[0.92]';
      break;
    case 'pill-link':
      baseStyles += ' bg-white text-ink border border-hairline rounded-[20px] px-4 py-2 text-[14px] font-medium hover:border-ink active:scale-[0.92]';
      break;
    case 'filter':
      baseStyles += ' bg-white text-ink px-4 py-2 rounded-[8px] border border-hairline text-[14px] font-medium hover:border-ink active:scale-[0.92]';
      break;
    case 'media-control':
      baseStyles += ' h-11 w-11 rounded-full bg-white text-ink border border-hairline p-0 shadow-[0_0_0_4px_rgb(255,255,255)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-[0.92]';
      break;
  }

  return (
    <motion.button
      className={`${baseStyles} ${className}`}
      whileTap={props.disabled ? undefined : tapSpring.whileTap}
      whileHover={props.disabled ? undefined : tapSpring.whileHover}
      transition={tapSpring.transition}
      {...props}
    >
      {children}
    </motion.button>
  );
}

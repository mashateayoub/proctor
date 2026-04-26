'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type CanonicalButtonVariant = 'primary' | 'secondary' | 'ghost' | 'filter' | 'danger' | 'icon';
type LegacyButtonVariant = 'primary-blue' | 'primary-dark' | 'pill' | 'pill-link' | 'media-control' | 'tab';
type ButtonVariant = CanonicalButtonVariant | LegacyButtonVariant;
type ButtonSize = 'xs' | 'sm' | 'md';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[11px] rounded-[7px]',
  sm: 'h-8 px-3 text-[12px] rounded-[8px]',
  md: 'h-9 px-4 text-[13px] rounded-[9px]',
};

function resolveVariant(variant: ButtonVariant): { variant: CanonicalButtonVariant; className: string } {
  switch (variant) {
    case 'primary-blue':
      return { variant: 'primary', className: '' };
    case 'primary-dark':
      return { variant: 'primary', className: 'bg-ink hover:bg-charcoal' };
    case 'pill':
      return { variant: 'secondary', className: 'rounded-[999px]' };
    case 'pill-link':
      return { variant: 'ghost', className: 'rounded-[999px]' };
    case 'media-control':
      return { variant: 'icon', className: 'h-9 w-9 rounded-full shadow-[0_0_0_3px_rgb(255,255,255)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.08)]' };
    case 'tab':
      return { variant: 'filter', className: 'rounded-[999px]' };
    default:
      return { variant, className: '' };
  }
}

const variantStyles: Record<CanonicalButtonVariant, string> = {
  primary: 'bg-rausch text-white border border-transparent hover:bg-deep-rausch',
  secondary: 'bg-white text-ink border border-hairline hover:border-ink',
  ghost: 'bg-soft-cloud/20 text-ink border border-transparent hover:bg-soft-cloud/70',
  filter: 'bg-white text-ink border border-hairline hover:border-ink',
  danger: 'bg-white text-[var(--color-error)] border border-[var(--color-error)]/20 hover:bg-red-50',
  icon: 'h-8 w-8 rounded-full p-0 bg-white text-ink border border-hairline hover:border-ink',
};

export function Button({ variant = 'primary', size = 'sm', children, className = '', ...props }: ButtonProps) {
  const resolved = resolveVariant(variant);
  const baseStyles = [
    'inline-flex cursor-pointer items-center justify-center whitespace-nowrap font-medium leading-none transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
    'disabled:pointer-events-none disabled:opacity-50',
    resolved.variant === 'icon' ? '' : sizeStyles[size],
    variantStyles[resolved.variant],
    resolved.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      className={`${baseStyles} ${className}`}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

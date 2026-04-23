'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { scaleIn } from '@/lib/motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  delay?: number;
}

export function Card({ children, className = '', elevated = false, delay = 0 }: CardProps) {
  // Apple barely uses borders. Elevation comes from the soft wide shadow when needed.
  const elevationStyles = elevated 
    ? 'shadow-[0_5px_30px_0_rgba(0,0,0,0.22)]' 
    : 'shadow-none';

  return (
    <motion.div
      initial={scaleIn.initial}
      animate={scaleIn.animate}
      transition={{ ...scaleIn.transition, delay }}
      className={`bg-apple-gray dark:bg-[#272729] rounded-[8px] border-none overflow-hidden ${elevationStyles} ${className}`}
    >
      {children}
    </motion.div>
  );
}

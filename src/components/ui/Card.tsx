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
  const elevationStyles = elevated 
    ? 'airbnb-card-shadow' 
    : 'shadow-none';

  return (
    <motion.div
      initial={scaleIn.initial}
      animate={scaleIn.animate}
      transition={{ ...scaleIn.transition, delay }}
      className={`overflow-hidden rounded-[14px] border border-hairline bg-white text-ink ${elevationStyles} ${className}`}
    >
      {children}
    </motion.div>
  );
}

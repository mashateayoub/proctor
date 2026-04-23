'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeIn, staggerContainer } from '@/lib/motion';

interface NavLink {
  label: string;
  href: string;
}

interface GlassNavProps {
  links: NavLink[];
  logoText?: string;
  rightAction?: React.ReactNode;
}

export function GlassNav({ links, logoText = "AiProctor", rightAction }: GlassNavProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="fixed top-0 left-0 right-0 z-50 h-[48px] bg-[rgba(0,0,0,0.8)] backdrop-blur-[20px] saturate-180 flex items-center justify-between px-6"
    >
      <motion.div {...fadeIn} className="flex items-center gap-2">
        <Link href="/" className="text-white text-[12px] font-normal leading-none tracking-tight hover:opacity-80 transition-opacity">
          {logoText}
        </Link>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="hidden md:flex items-center gap-8"
      >
        {links.map((link, idx) => (
          <motion.div
            key={idx}
            variants={{ initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 } }}
          >
            <Link 
              href={link.href}
              className="text-white text-[12px] font-normal leading-none hover:underline underline-offset-4 opacity-90 transition-all"
            >
              {link.label}
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.3 }} className="flex items-center">
        {rightAction}
      </motion.div>
    </motion.nav>
  );
}

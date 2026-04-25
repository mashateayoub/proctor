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
      className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-hairline bg-white flex items-center justify-between px-6"
    >
      <motion.div {...fadeIn} className="flex items-center gap-2">
        <Link href="/" className="text-rausch text-[16px] font-bold leading-none hover:text-deep-rausch transition-colors">
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
              className="text-ink text-[14px] font-medium leading-none hover:underline underline-offset-4 transition-all"
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

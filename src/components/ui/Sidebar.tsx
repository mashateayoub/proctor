'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { slideLeft, staggerContainer, fadeIn } from '@/lib/motion';

export interface SidebarLink {
  label: string;
  href: string;
}

interface SidebarProps {
  roleTitle: string;
  links: SidebarLink[];
}

export function Sidebar({ roleTitle, links }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="w-[260px] bg-white h-screen border-r border-hairline flex flex-col flex-shrink-0"
    >
      <motion.div
        {...fadeIn}
        transition={{ ...fadeIn.transition, delay: 0.2 }}
        className="h-20 flex items-center px-6 font-display font-bold text-[20px] text-[var(--color-rausch)] tracking-tight"
      >
        AiProctor <span className="font-sans font-semibold text-[var(--color-ash)] ml-2 text-[14px] uppercase tracking-widest">{roleTitle}</span>
      </motion.div>
      
      <motion.nav
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex-1 px-4 py-6 space-y-1 overflow-y-auto"
      >
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <motion.div key={link.href} variants={slideLeft}>
              <Link 
                href={link.href}
                className={`block rounded-[12px] px-4 py-3 text-[14px] font-semibold transition-all ${isActive ? 'bg-[var(--color-soft-cloud)] text-[var(--color-ink)] shadow-sm border border-[var(--color-hairline)]' : 'text-[var(--color-ash)] hover:bg-[var(--color-soft-cloud)] hover:text-[var(--color-ink)]'}`}
              >
                {link.label}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>
      
      <motion.div
        {...fadeIn}
        transition={{ ...fadeIn.transition, delay: 0.5 }}
        className="p-4 border-t border-[var(--color-hairline)]"
      >
        <p className="text-center text-[10px] font-bold text-[var(--color-mute)] uppercase tracking-tighter">Secure Engine v1.0</p>
      </motion.div>
    </motion.aside>
  );
}

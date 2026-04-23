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
      className="w-[260px] bg-[#f5f5f7] dark:bg-[#1d1d1f] h-screen border-r border-black/10 dark:border-white/10 flex flex-col flex-shrink-0"
    >
      <motion.div
        {...fadeIn}
        transition={{ ...fadeIn.transition, delay: 0.2 }}
        className="h-[60px] flex items-center px-6 font-semibold tracking-tight text-[18px]"
      >
        AiProctor <span className="font-normal text-black/50 dark:text-white/50 ml-1">{roleTitle}</span>
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
                className={`block px-3 py-2 rounded-[8px] text-[14px] transition-colors ${isActive ? 'bg-[#e5e5eab3] dark:bg-white/10 font-semibold' : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'}`}
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
        className="p-4 border-t border-black/10 dark:border-white/10"
      >
        <p className="text-[10px] text-black/40 dark:text-white/40 text-center">Secure Engine v1.0</p>
      </motion.div>
    </motion.aside>
  );
}

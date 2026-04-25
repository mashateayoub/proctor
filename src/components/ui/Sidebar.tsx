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
        className="h-20 flex items-center px-6 font-bold text-[18px] text-rausch"
      >
        AiProctor <span className="font-medium text-ash ml-1">{roleTitle}</span>
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
                className={`block rounded-[20px] px-4 py-3 text-[14px] font-medium transition-colors ${isActive ? 'bg-soft-cloud text-ink shadow-[inset_0_0_0_1px_#dddddd]' : 'text-ash hover:bg-soft-cloud hover:text-ink'}`}
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
        className="p-4 border-t border-hairline"
      >
        <p className="text-center text-[10px] font-medium text-mute">Secure Engine v1.0</p>
      </motion.div>
    </motion.aside>
  );
}

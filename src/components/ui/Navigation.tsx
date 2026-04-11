import React from 'react';
import Link from 'next/link';

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
    <nav className="fixed top-0 left-0 right-0 z-50 h-[48px] bg-[rgba(0,0,0,0.8)] backdrop-blur-[20px] saturate-180 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-white text-[12px] font-normal leading-none tracking-tight hover:opacity-80 transition-opacity">
          {logoText}
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-8">
        {links.map((link, idx) => (
          <Link 
            key={idx} 
            href={link.href}
            className="text-white text-[12px] font-normal leading-none hover:underline underline-offset-4 opacity-90 transition-all"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center">
        {rightAction}
      </div>
    </nav>
  );
}

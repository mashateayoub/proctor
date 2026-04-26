'use client';

import React from 'react';

interface TableToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function TableToolbar({ children, className = '' }: TableToolbarProps) {
  return (
    <div className={`flex flex-col gap-3 border-b border-hairline bg-soft-cloud/25 px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}


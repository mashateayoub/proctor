import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, className = '', elevated = false }: CardProps) {
  // Apple barely uses borders. Elevation comes from the soft wide shadow when needed.
  const elevationStyles = elevated 
    ? 'shadow-[0_5px_30px_0_rgba(0,0,0,0.22)]' 
    : 'shadow-none';

  return (
    <div className={`bg-apple-gray dark:bg-[#272729] rounded-[8px] border-none overflow-hidden ${elevationStyles} ${className}`}>
      {children}
    </div>
  );
}

import React from 'react';

type ButtonVariant = 'primary-blue' | 'primary-dark' | 'pill-link' | 'filter' | 'media-control';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export function Button({ variant = 'primary-blue', children, className = '', ...props }: ButtonProps) {
  let baseStyles = 'inline-flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-blue';
  
  switch (variant) {
    case 'primary-blue':
      baseStyles += ' bg-apple-blue text-white px-[15px] py-[8px] rounded-[8px] border border-transparent text-[17px] font-normal leading-[1.47] hover:brightness-110 active:bg-[#ededf2] active:text-apple-dark';
      break;
    case 'primary-dark':
      baseStyles += ' bg-apple-dark text-white px-[15px] py-[8px] rounded-[8px] text-[17px] font-normal leading-[1.47] hover:bg-black';
      break;
    case 'pill-link':
      baseStyles += ' bg-transparent text-apple-link border border-apple-link rounded-[980px] px-[15px] py-[8px] text-[14px] font-normal hover:underline dark:text-apple-link-dark dark:border-apple-link-dark';
      break;
    case 'filter':
      baseStyles += ' bg-[#fafafc] text-black/80 px-[14px] py-[0px] rounded-[11px] border-[3px] border-black/5 dark:bg-[#272729] dark:text-white dark:border-white/10';
      break;
    case 'media-control':
      baseStyles += ' bg-[#d2d2d7a3] text-black/48 rounded-full p-3 hover:scale-95 active:scale-90';
      break;
  }

  return (
    <button className={`${baseStyles} ${className}`} {...props}>
      {children}
    </button>
  );
}

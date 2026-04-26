'use client';

export interface FilterOption {
  label: string;
  value: string;
}

interface TableFilterChipsProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
}

export function TableFilterChips({ value, onChange, options, className = '' }: TableFilterChipsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex h-7 items-center rounded-[999px] border px-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              active
                ? 'border-ink bg-ink text-white'
                : 'border-hairline bg-white text-ash hover:border-ink hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

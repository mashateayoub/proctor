'use client';

interface TableSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TableSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: TableSearchInputProps) {
  return (
    <div className={`relative w-full md:max-w-[340px] ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 21L15.8 15.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-[8px] border border-hairline bg-white pl-9 pr-8 text-[12px] font-medium text-ink outline-none transition-colors placeholder:text-ash focus:border-ink"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-ash transition-colors hover:bg-soft-cloud hover:text-ink"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

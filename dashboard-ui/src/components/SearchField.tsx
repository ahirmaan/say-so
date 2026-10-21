import { Search } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcutHint?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function SearchField({
  value,
  onChange,
  placeholder = 'Search...',
  shortcutHint,
  className = '',
  autoFocus,
}: SearchFieldProps) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-border bg-elevated py-2 pl-9 pr-16 text-sm text-text placeholder:text-text-muted outline-none transition-colors focus:border-accent/60"
      />
      {shortcutHint && !value && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[11px] text-text-muted">
          {shortcutHint}
        </kbd>
      )}
    </div>
  );
}

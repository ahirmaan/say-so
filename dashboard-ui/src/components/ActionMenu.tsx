import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

export default function ActionMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-card hover:text-text"
        aria-label="More actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-card border border-border bg-elevated py-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                item.danger ? 'text-error hover:bg-error/10' : 'text-text-secondary hover:bg-card hover:text-text'
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';
import { Mic } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  showHotkeyHint?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, showHotkeyHint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-text-muted">
          <Icon size={18} />
        </div>
      )}
      <div className="text-sm font-medium text-text">{title}</div>
      {description && <div className="mt-1 max-w-xs text-xs text-text-muted">{description}</div>}
      {showHotkeyHint && (
        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <Mic size={13} className="text-accent" />
          <span>
            Press <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[11px]">F9</kbd> to
            capture a new fact with Say.so
          </span>
        </div>
      )}
    </div>
  );
}

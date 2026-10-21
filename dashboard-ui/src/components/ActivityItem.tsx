import {
  PlusCircle,
  FolderPlus,
  FolderInput,
  Star,
  StarOff,
  Pencil,
  Trash2,
  FolderX,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityEntry } from '../lib/types';
import { formatRelativeTime } from '../lib/format';

const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  fact_created: { icon: PlusCircle, color: 'text-success' },
  fact_updated: { icon: Pencil, color: 'text-accent-cyan' },
  fact_moved: { icon: FolderInput, color: 'text-accent' },
  fact_favorited: { icon: Star, color: 'text-warning' },
  fact_unfavorited: { icon: StarOff, color: 'text-text-muted' },
  fact_deleted: { icon: Trash2, color: 'text-error' },
  folder_created: { icon: FolderPlus, color: 'text-accent' },
  folder_renamed: { icon: Pencil, color: 'text-accent-cyan' },
  folder_deleted: { icon: FolderX, color: 'text-error' },
};

export default function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const meta = TYPE_META[entry.type] ?? { icon: PlusCircle, color: 'text-text-muted' };
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-elevated ${meta.color}`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm text-text">{entry.description}</div>
        {entry.folder_name && (
          <div className="text-xs text-accent-cyan">{entry.folder_name}</div>
        )}
      </div>
      <div className="shrink-0 text-xs text-text-muted">{formatRelativeTime(entry.created_at)}</div>
    </div>
  );
}

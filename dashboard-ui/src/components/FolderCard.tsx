import { useNavigate } from 'react-router-dom';
import { Pencil, Palette, Trash2 } from 'lucide-react';
import type { Folder } from '../lib/types';
import { resolveFolderIcon } from '../lib/folderIcons';
import { formatRelativeTime } from '../lib/format';
import ActionMenu from './ActionMenu';

interface FolderCardProps {
  folder: Folder;
  onRename: () => void;
  onChangeIcon: () => void;
  onDelete: () => void;
}

export default function FolderCard({ folder, onRename, onChangeIcon, onDelete }: FolderCardProps) {
  const navigate = useNavigate();
  const Icon = resolveFolderIcon(folder.name, folder.icon);

  return (
    <div
      onClick={() => navigate(`/folders/${folder.id}`)}
      className="group cursor-pointer rounded-card border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Icon size={17} />
        </div>
        <ActionMenu
          items={[
            { label: 'Rename folder', icon: Pencil, onClick: onRename },
            { label: 'Change icon', icon: Palette, onClick: onChangeIcon },
            { label: 'Delete folder', icon: Trash2, onClick: onDelete, danger: true },
          ]}
        />
      </div>

      <div className="mt-3 text-sm font-medium text-text">{folder.name}</div>
      <div className="text-xs text-text-muted">{folder.fact_count} notes</div>

      {folder.description && (
        <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{folder.description}</p>
      )}

      <div className="mt-3 text-[11px] text-text-muted">
        {folder.last_activity_at
          ? `Updated ${formatRelativeTime(folder.last_activity_at)}`
          : 'No notes yet'}
      </div>
    </div>
  );
}

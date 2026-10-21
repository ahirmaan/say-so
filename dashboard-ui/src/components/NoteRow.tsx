import { useNavigate } from 'react-router-dom';
import { FileText, Star, Pencil, Copy, FolderInput, Trash2 } from 'lucide-react';
import type { Note } from '../lib/types';
import { formatRelativeTime } from '../lib/format';
import ActionMenu from './ActionMenu';
import { useToast } from '../lib/toast';

interface NoteRowProps {
  note: Note;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onToggleFavorite: (note: Note) => void;
  onEdit: (note: Note) => void;
  onMove: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export default function NoteRow({
  note,
  selectable,
  selected,
  onToggleSelect,
  onToggleFavorite,
  onEdit,
  onMove,
  onDelete,
}: NoteRowProps) {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <div
      onClick={() => navigate(`/notes/${note.id}`)}
      className="group flex cursor-pointer items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-card"
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect?.(note.id)}
          className="mt-1 h-3.5 w-3.5 shrink-0 accent-accent"
        />
      )}

      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-elevated text-text-muted">
        <FileText size={14} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text">{note.content || '(empty)'}</div>
        <div className="line-clamp-1 text-xs text-text-muted">{note.raw_transcript}</div>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 text-xs text-accent-cyan sm:flex">
        <span>{note.folder_name}</span>
      </div>

      <div className="hidden shrink-0 text-xs text-text-muted md:block">
        {formatRelativeTime(note.updated_at)}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(note);
        }}
        className="shrink-0 text-text-muted transition-colors hover:text-warning"
        aria-label="Toggle favorite"
      >
        <Star size={15} className={note.favorite ? 'fill-warning text-warning' : ''} />
      </button>

      <ActionMenu
        items={[
          { label: 'Edit note', icon: Pencil, onClick: () => onEdit(note) },
          {
            label: 'Copy content',
            icon: Copy,
            onClick: () => {
              navigator.clipboard.writeText(note.content);
              toast.show('Copied to clipboard');
            },
          },
          { label: 'Move to folder', icon: FolderInput, onClick: () => onMove(note) },
          { label: 'Delete note', icon: Trash2, onClick: () => onDelete(note), danger: true },
        ]}
      />
    </div>
  );
}

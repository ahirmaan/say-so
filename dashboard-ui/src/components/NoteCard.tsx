import { useNavigate } from 'react-router-dom';
import { Star, Pencil, Copy, FolderInput, Trash2 } from 'lucide-react';
import type { Note } from '../lib/types';
import { formatRelativeTime } from '../lib/format';
import ActionMenu from './ActionMenu';
import { useToast } from '../lib/toast';

interface NoteCardProps {
  note: Note;
  onToggleFavorite: (note: Note) => void;
  onEdit: (note: Note) => void;
  onMove: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export default function NoteCard({ note, onToggleFavorite, onEdit, onMove, onDelete }: NoteCardProps) {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <div
      onClick={() => navigate(`/notes/${note.id}`)}
      className="group flex cursor-pointer flex-col rounded-card border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
          {note.folder_name}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(note);
            }}
            className="text-text-muted transition-colors hover:text-warning"
            aria-label="Toggle favorite"
          >
            <Star size={14} className={note.favorite ? 'fill-warning text-warning' : ''} />
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
      </div>

      <div className="line-clamp-2 text-sm text-text">{note.content || '(empty)'}</div>
      <div className="mt-1 line-clamp-2 text-xs text-text-muted">{note.raw_transcript}</div>

      <div className="mt-3 text-[11px] text-text-muted">{formatRelativeTime(note.updated_at)}</div>
    </div>
  );
}

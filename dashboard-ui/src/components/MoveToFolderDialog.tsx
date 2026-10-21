import { useEffect, useState } from 'react';
import Modal from './Modal';
import type { Folder, Note } from '../lib/types';
import { resolveFolderIcon } from '../lib/folderIcons';
import { useToast } from '../lib/toast';

interface MoveToFolderDialogProps {
  note: Note | null;
  notes?: Note[]; // when moving multiple at once (bulk)
  onClose: () => void;
  onMoved: () => void;
}

export default function MoveToFolderDialog({ note, notes, onClose, onMoved }: MoveToFolderDialogProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const open = !!note || !!(notes && notes.length);

  useEffect(() => {
    if (open) window.dashboard.listFolders().then(setFolders);
  }, [open]);

  async function moveTo(folderId: number) {
    setBusy(true);
    try {
      if (notes && notes.length) {
        await window.dashboard.bulkMove(notes.map((n) => n.id), folderId);
        toast.show(`Moved ${notes.length} note${notes.length > 1 ? 's' : ''}`);
      } else if (note) {
        await window.dashboard.moveFact(note.id, folderId);
        toast.show('Note moved');
      }
      onMoved();
    } catch (err) {
      toast.show((err as Error).message || 'Could not move note(s)', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Move to Folder" width={360}>
      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {folders.map((f) => {
          const Icon = resolveFolderIcon(f.name, f.icon);
          return (
            <button
              key={f.id}
              disabled={busy}
              onClick={() => moveTo(f.id)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-card hover:text-text disabled:opacity-50"
            >
              <Icon size={15} className="text-accent" />
              {f.name}
              <span className="ml-auto text-xs text-text-muted">{f.fact_count}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

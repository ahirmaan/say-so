import { useEffect, useState } from 'react';
import Modal from './Modal';
import type { Folder } from '../lib/types';
import { useToast } from '../lib/toast';

interface RenameFolderDialogProps {
  folder: Folder | null;
  onClose: () => void;
  onRenamed: () => void;
}

export default function RenameFolderDialog({ folder, onClose, onRenamed }: RenameFolderDialogProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (folder) setName(folder.name);
  }, [folder]);

  async function handleSave() {
    if (!folder || !name.trim()) return;
    setBusy(true);
    try {
      await window.dashboard.renameFolder(folder.id, name.trim());
      toast.show('Folder renamed');
      onRenamed();
    } catch (err) {
      toast.show((err as Error).message || 'Could not rename folder', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!folder} onClose={onClose} title="Rename Folder" width={380}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        autoFocus
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-accent/60"
      />
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm text-text-secondary hover:bg-card hover:text-text"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}

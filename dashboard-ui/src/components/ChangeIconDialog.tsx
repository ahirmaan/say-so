import { useState } from 'react';
import Modal from './Modal';
import type { Folder } from '../lib/types';
import { FOLDER_ICON_OPTIONS } from '../lib/folderIcons';
import { useToast } from '../lib/toast';

interface ChangeIconDialogProps {
  folder: Folder | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function ChangeIconDialog({ folder, onClose, onChanged }: ChangeIconDialogProps) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function pick(key: string) {
    if (!folder) return;
    setBusy(true);
    try {
      await window.dashboard.setFolderIcon(folder.id, key);
      toast.show('Icon updated');
      onChanged();
    } catch (err) {
      toast.show((err as Error).message || 'Could not update icon', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!folder} onClose={onClose} title={`Change icon${folder ? ` - ${folder.name}` : ''}`} width={400}>
      <div className="grid grid-cols-8 gap-2">
        {Object.entries(FOLDER_ICON_OPTIONS).map(([key, Icon]) => (
          <button
            key={key}
            disabled={busy}
            onClick={() => pick(key)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
              folder?.icon === key
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-card text-text-secondary hover:text-text'
            }`}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </Modal>
  );
}

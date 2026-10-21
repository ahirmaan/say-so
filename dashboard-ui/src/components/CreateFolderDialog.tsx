import { useState } from 'react';
import Modal from './Modal';
import { FOLDER_ICON_OPTIONS } from '../lib/folderIcons';
import { useToast } from '../lib/toast';

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateFolderDialog({ open, onClose, onCreated }: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  function reset() {
    setName('');
    setDescription('');
    setIcon(null);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await window.dashboard.createFolder(name.trim(), icon, description.trim() || null);
      toast.show(`Folder "${name.trim()}" created`);
      reset();
      onCreated();
    } catch (err) {
      toast.show((err as Error).message || 'Could not create folder', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create Folder"
      width={420}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="e.g. Product Ideas"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-accent/60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Description <span className="text-text-muted">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What goes in this folder?"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text outline-none focus:border-accent/60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Icon <span className="text-text-muted">(optional - auto-picked if skipped)</span>
          </label>
          <div className="grid grid-cols-8 gap-2">
            {Object.entries(FOLDER_ICON_OPTIONS).map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setIcon(icon === key ? null : key)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  icon === key
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-card text-text-secondary hover:text-text'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={() => {
            reset();
            onClose();
          }}
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm text-text-secondary hover:bg-card hover:text-text"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create Folder'}
        </button>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={400}>
      <div className="flex items-start gap-3">
        {danger && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/15 text-error">
            <AlertTriangle size={16} />
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-text">{title}</div>
          {description && <div className="mt-1 text-xs text-text-secondary">{description}</div>}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-text"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
            danger ? 'bg-error hover:bg-error/90' : 'bg-accent hover:bg-accent/90'
          }`}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, width = 480, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      style={{ animation: 'modalOverlayIn 150ms ease-out' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-card border border-border bg-elevated p-5 shadow-2xl"
        style={{ width, animation: 'modalIn 160ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-muted hover:bg-card hover:text-text"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
      <style>{`
        @keyframes modalOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

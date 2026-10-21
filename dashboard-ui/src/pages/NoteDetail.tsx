import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Pencil, Copy, FolderInput, Trash2, Check, X } from 'lucide-react';
import type { Note } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import MoveToFolderDialog from '../components/MoveToFolderDialog';

export default function NoteDetail() {
  const { id } = useParams();
  const noteId = Number(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [note, setNote] = useState<Note | null>(null);
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  async function load() {
    const fact = await window.dashboard.getFact(noteId);
    setNote(fact);
    setDraft(fact.content);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  // useState's initializer only runs on first mount, so navigating here from
  // elsewhere while this exact note is already mounted (same noteId, just a
  // new ?edit=1) wouldn't otherwise flip into edit mode - sync explicitly.
  useEffect(() => {
    if (searchParams.get('edit') === '1') setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, searchParams.get('edit')]);

  const dirty = note ? draft !== note.content : false;

  function requestExitEdit() {
    if (dirty) {
      setDiscardConfirmOpen(true);
    } else {
      setEditing(false);
    }
  }

  async function save() {
    if (!note) return;
    setSaving(true);
    try {
      const updated = await window.dashboard.updateFactContent(note.id, draft);
      setNote(updated);
      setEditing(false);
      toast.show('Note saved');
    } catch (err) {
      toast.show((err as Error).message || 'Could not save note', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite() {
    if (!note) return;
    const updated = await window.dashboard.setFactFavorite(note.id, !note.favorite);
    setNote(updated);
  }

  if (!note) {
    return <div className="px-6 py-6 text-sm text-text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
        <Link to={`/folders/${note.folder_id}`} className="text-accent-cyan hover:underline">
          {note.folder_name}
        </Link>
        <span>/</span>
        <span>Note</span>
      </div>

      <div className="rounded-card border border-border bg-card p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold leading-snug text-text">
            {editing ? 'Editing note' : note.content || '(empty note)'}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={toggleFavorite} className="text-text-muted hover:text-warning" aria-label="Toggle favorite">
              <Star size={17} className={note.favorite ? 'fill-warning text-warning' : ''} />
            </button>
          </div>
        </div>

        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-elevated p-3 text-sm leading-relaxed text-text outline-none focus:border-accent/60"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={save}
                disabled={saving || !draft.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                <Check size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={requestExitEdit}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-sm text-text-secondary hover:bg-elevated hover:text-text"
              >
                <X size={14} /> Cancel
              </button>
              {dirty && <span className="text-xs text-warning">Unsaved changes</span>}
            </div>
          </>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{note.raw_transcript}</p>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-text-muted">Original transcript</div>
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-elevated hover:text-text"
            >
              <Pencil size={13} /> Edit
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(note.content);
              toast.show('Copied to clipboard');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-elevated hover:text-text"
          >
            <Copy size={13} /> Copy
          </button>
          <button
            onClick={() => setMoveOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-elevated hover:text-text"
          >
            <FolderInput size={13} /> Move to Folder
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-1.5 text-xs text-error hover:bg-error/10"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

        <div className="mt-4 flex gap-4 text-[11px] text-text-muted">
          <span>Created {formatDateTime(note.created_at)}</span>
          <span>Updated {formatDateTime(note.updated_at)}</span>
        </div>
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete this note?"
        description={note.content}
        confirmLabel="Delete"
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await window.dashboard.deleteFact(note.id);
          toast.show('Note deleted');
          navigate('/notes');
        }}
      />

      <MoveToFolderDialog
        note={moveOpen ? note : null}
        onClose={() => setMoveOpen(false)}
        onMoved={() => {
          setMoveOpen(false);
          load();
        }}
      />

      <ConfirmationDialog
        open={discardConfirmOpen}
        title="Discard unsaved changes?"
        description="Your edits haven't been saved."
        confirmLabel="Discard"
        onClose={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          setDraft(note.content);
          setEditing(false);
          setDiscardConfirmOpen(false);
        }}
      />
    </div>
  );
}

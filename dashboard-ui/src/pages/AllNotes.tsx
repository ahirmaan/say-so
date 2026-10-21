import { useEffect, useMemo, useState } from 'react';
import { List, LayoutGrid, Star, FolderInput, Trash2 } from 'lucide-react';
import SearchField from '../components/SearchField';
import NoteRow from '../components/NoteRow';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import ConfirmationDialog from '../components/ConfirmationDialog';
import MoveToFolderDialog from '../components/MoveToFolderDialog';
import type { Folder, Note, SortOption } from '../lib/types';
import { useNoteActions } from '../lib/useNoteActions';
import { useToast } from '../lib/toast';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent_added', label: 'Recently Added' },
  { value: 'recent_updated', label: 'Recently Updated' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function AllNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState<number | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('recent_added');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const [res, f] = await Promise.all([
      window.dashboard.listFacts({
        search: search || undefined,
        folderId: folderId === 'all' ? undefined : folderId,
        favoritesOnly: favoritesOnly || undefined,
        sort,
        limit: 500,
      }),
      window.dashboard.listFolders(),
    ]);
    setNotes(res.rows);
    setFolders(f);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, folderId, favoritesOnly, sort]);

  const { onToggleFavorite, onEdit, onMove, onDelete, dialogs } = useNoteActions(load);

  const selectedNotes = useMemo(() => notes.filter((n) => selected.has(n.id)), [notes, selected]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-text">All Notes</h2>
        <p className="text-sm text-text-secondary">Every fact, idea, and insight you've saved.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchField value={search} onChange={setSearch} placeholder="Search notes..." className="w-64" />

        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-secondary outline-none"
        >
          <option value="all">All folders</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            favoritesOnly
              ? 'border-warning/40 bg-warning/10 text-warning'
              : 'border-border bg-elevated text-text-secondary hover:text-text'
          }`}
        >
          <Star size={14} className={favoritesOnly ? 'fill-warning' : ''} />
          Favorites
        </button>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-secondary outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-elevated p-1">
          <button
            onClick={() => setView('list')}
            className={`rounded-md p-1.5 ${view === 'list' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
            aria-label="List view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
            aria-label="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-card border border-accent/30 bg-accent/10 px-4 py-2.5">
          <span className="text-sm text-text">{selected.size} selected</span>
          <button
            onClick={() => setBulkMoveOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-text-secondary hover:text-text"
          >
            <FolderInput size={13} /> Move
          </button>
          <button
            onClick={async () => {
              await window.dashboard.bulkFavorite(Array.from(selected), true);
              toast.show('Added to favorites');
              setSelected(new Set());
              load();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-text-secondary hover:text-text"
          >
            <Star size={13} /> Favorite
          </button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-error/30 bg-error/10 px-2.5 py-1 text-xs text-error"
          >
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-text-muted hover:text-text">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-card bg-card" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState title="No notes yet." description="Your saved knowledge will appear here." showHotkeyHint />
      ) : view === 'list' ? (
        <div className="overflow-hidden rounded-card border border-border bg-card">
          {notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              selectable
              selected={selected.has(note.id)}
              onToggleSelect={toggleSelect}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onToggleFavorite={onToggleFavorite} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />
          ))}
        </div>
      )}

      {dialogs}

      <MoveToFolderDialog
        note={null}
        notes={bulkMoveOpen ? selectedNotes : undefined}
        onClose={() => setBulkMoveOpen(false)}
        onMoved={() => {
          setBulkMoveOpen(false);
          setSelected(new Set());
          load();
        }}
      />

      <ConfirmationDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} note${selected.size > 1 ? 's' : ''}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={async () => {
          await window.dashboard.bulkDelete(Array.from(selected));
          toast.show('Notes deleted');
          setBulkDeleteOpen(false);
          setSelected(new Set());
          load();
        }}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { List, LayoutGrid, Pencil, Palette, Trash2 } from 'lucide-react';
import SearchField from '../components/SearchField';
import NoteRow from '../components/NoteRow';
import NoteCard from '../components/NoteCard';
import EmptyState from '../components/EmptyState';
import ActionMenu from '../components/ActionMenu';
import type { Folder, Note, SortOption } from '../lib/types';
import { resolveFolderIcon } from '../lib/folderIcons';
import { useNoteActions } from '../lib/useNoteActions';
import { useFolderActions } from '../lib/useFolderActions';

export default function FolderDetail() {
  const { id } = useParams();
  const folderId = Number(id);
  const navigate = useNavigate();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('recent_added');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [folders, res] = await Promise.all([
      window.dashboard.listFolders(),
      window.dashboard.listFacts({ folderId, search: search || undefined, sort, limit: 500 }),
    ]);
    const found = folders.find((f) => f.id === folderId) ?? null;
    if (!found && folder) {
      // It existed a moment ago and now doesn't - it was just deleted.
      navigate('/folders');
      return;
    }
    setFolder(found);
    setNotes(res.rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, search, sort]);

  const { onToggleFavorite, onEdit, onMove, onDelete, dialogs: noteDialogs } = useNoteActions(load);
  const { getActions, dialogs: folderDialogs } = useFolderActions(() => {
    load();
  });

  if (!folder) {
    return (
      <div className="px-6 py-6 text-sm text-text-muted">
        {loading ? 'Loading…' : 'Folder not found.'}
      </div>
    );
  }

  const Icon = resolveFolderIcon(folder.name, folder.icon);
  const actions = getActions(folder);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">{folder.name}</h2>
            {folder.description && <p className="text-sm text-text-secondary">{folder.description}</p>}
            <p className="text-xs text-text-muted">{folder.fact_count} notes</p>
          </div>
        </div>
        <ActionMenu
          items={[
            { label: 'Rename folder', icon: Pencil, onClick: actions.onRename },
            { label: 'Change icon', icon: Palette, onClick: actions.onChangeIcon },
            {
              label: 'Delete folder',
              icon: Trash2,
              danger: true,
              onClick: actions.onDelete,
            },
          ]}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchField value={search} onChange={setSearch} placeholder="Search within this folder..." className="w-64" />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-secondary outline-none"
        >
          <option value="recent_added">Recently Added</option>
          <option value="recent_updated">Recently Updated</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="oldest">Oldest First</option>
        </select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-elevated p-1">
          <button
            onClick={() => setView('list')}
            className={`rounded-md p-1.5 ${view === 'list' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState title="No notes in this folder yet." showHotkeyHint />
      ) : view === 'list' ? (
        <div className="overflow-hidden rounded-card border border-border bg-card">
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} onToggleFavorite={onToggleFavorite} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onToggleFavorite={onToggleFavorite} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />
          ))}
        </div>
      )}

      {noteDialogs}
      {folderDialogs}
    </div>
  );
}

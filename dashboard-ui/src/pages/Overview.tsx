import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, FolderClosed, CalendarPlus, Star, Sparkles, ArrowRight } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import NoteRow from '../components/NoteRow';
import FolderCard from '../components/FolderCard';
import EmptyState from '../components/EmptyState';
import type { Folder, Note, OverviewStats } from '../lib/types';
import { useNoteActions } from '../lib/useNoteActions';
import { useFolderActions } from '../lib/useFolderActions';

export default function Overview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recent, setRecent] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  async function load() {
    const [s, f, notes] = await Promise.all([
      window.dashboard.getOverviewStats(),
      window.dashboard.listFolders(),
      window.dashboard.listFacts({ sort: 'recent_added', limit: 5 }),
    ]);
    setStats(s);
    setFolders(f);
    setRecent(notes.rows);
  }

  useEffect(() => {
    load();
  }, []);

  const { onToggleFavorite, onEdit, onMove, onDelete, dialogs: noteDialogs } = useNoteActions(load);
  const { getActions, dialogs: folderDialogs } = useFolderActions(load);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-text">Your Knowledge</h2>
        <p className="text-sm text-text-secondary">Everything you've captured, organized in one place.</p>
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-card border border-border bg-gradient-to-r from-accent/10 to-accent-cyan/5 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
          <Sparkles size={16} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-text">Your ideas, always within reach.</div>
          <div className="text-xs text-text-secondary">
            Use your Say.so assistant to capture thoughts and organize them directly into your knowledge base.
          </div>
        </div>
        <kbd className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-text-secondary">
          F9
        </kbd>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={FileText} label="Total Notes" value={stats?.totalFacts ?? '—'} />
        <MetricCard icon={FolderClosed} label="Total Folders" value={stats?.totalFolders ?? '—'} />
        <MetricCard icon={CalendarPlus} label="Added Today" value={stats?.addedToday ?? '—'} />
        <MetricCard icon={Star} label="Favorites" value={stats?.favorites ?? '—'} />
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">Recently Saved</h3>
            <p className="text-xs text-text-muted">Pick up where you left off.</p>
          </div>
          <Link to="/notes" className="flex items-center gap-1 text-xs text-accent-cyan hover:underline">
            View All Notes <ArrowRight size={12} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No notes yet." description="Your saved knowledge will appear here." showHotkeyHint />
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-card">
            {recent.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onToggleFavorite={onToggleFavorite}
                onEdit={onEdit}
                onMove={onMove}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">Your Folders</h3>
            <p className="text-xs text-text-muted">Keep everything organized.</p>
          </div>
          <Link to="/folders" className="flex items-center gap-1 text-xs text-accent-cyan hover:underline">
            View All Folders <ArrowRight size={12} />
          </Link>
        </div>
        {folders.length === 0 ? (
          <EmptyState title="No folders yet." description="Create one from the sidebar to get started." />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {folders.slice(0, 8).map((folder) => (
              <FolderCard key={folder.id} folder={folder} {...getActions(folder)} />
            ))}
          </div>
        )}
      </section>

      {noteDialogs}
      {folderDialogs}
    </div>
  );
}

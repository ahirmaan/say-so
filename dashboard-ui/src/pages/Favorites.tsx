import { useEffect, useState } from 'react';
import NoteRow from '../components/NoteRow';
import EmptyState from '../components/EmptyState';
import type { Note } from '../lib/types';
import { useNoteActions } from '../lib/useNoteActions';

export default function Favorites() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await window.dashboard.listFacts({ favoritesOnly: true, sort: 'recent_updated', limit: 500 });
    setNotes(res.rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const { onToggleFavorite, onEdit, onMove, onDelete, dialogs } = useNoteActions(load);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-text">Favorites</h2>
        <p className="text-sm text-text-secondary">The notes you've marked as important.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-card bg-card" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState title="Your important notes will appear here." />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-card">
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} onToggleFavorite={onToggleFavorite} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />
          ))}
        </div>
      )}

      {dialogs}
    </div>
  );
}

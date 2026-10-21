import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Note } from './types';
import { useToast } from './toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import MoveToFolderDialog from '../components/MoveToFolderDialog';

// Shared action handlers for a single note, used by NoteRow/NoteCard across
// every page that lists notes (Overview, All Notes, Folder Detail, Favorites).
// Renders its own dialogs - drop `{dialogs}` once per page that uses it.
export function useNoteActions(onChanged: () => void) {
  const [movingNote, setMovingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  async function onToggleFavorite(note: Note) {
    try {
      await window.dashboard.setFactFavorite(note.id, !note.favorite);
      toast.show(note.favorite ? 'Removed from favorites' : 'Added to favorites');
      onChanged();
    } catch (err) {
      toast.show((err as Error).message || 'Could not update favorite', 'error');
    }
  }

  function onEdit(note: Note) {
    navigate(`/notes/${note.id}?edit=1`);
  }

  function onMove(note: Note) {
    setMovingNote(note);
  }

  function onDelete(note: Note) {
    setDeletingNote(note);
  }

  const dialogs = (
    <>
      <MoveToFolderDialog
        note={movingNote}
        onClose={() => setMovingNote(null)}
        onMoved={() => {
          setMovingNote(null);
          onChanged();
        }}
      />
      <ConfirmationDialog
        open={!!deletingNote}
        title={`Delete this note?`}
        description={deletingNote?.content || deletingNote?.raw_transcript}
        confirmLabel="Delete"
        onClose={() => setDeletingNote(null)}
        onConfirm={async () => {
          if (!deletingNote) return;
          await window.dashboard.deleteFact(deletingNote.id);
          toast.show('Note deleted');
          setDeletingNote(null);
          onChanged();
        }}
      />
    </>
  );

  return { onToggleFavorite, onEdit, onMove, onDelete, dialogs };
}

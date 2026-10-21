import { useState } from 'react';
import type { Folder } from './types';
import { useToast } from './toast';
import ConfirmationDialog from '../components/ConfirmationDialog';
import RenameFolderDialog from '../components/RenameFolderDialog';
import ChangeIconDialog from '../components/ChangeIconDialog';

// Shared action handlers for a single folder, used by FolderCard across
// every page that lists folders. getActions(folder) returns the three
// handlers FolderCard expects; render `{dialogs}` once per page.
export function useFolderActions(onChanged: () => void) {
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [iconFolder, setIconFolder] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();

  function getActions(folder: Folder) {
    return {
      onRename: () => setRenamingFolder(folder),
      onChangeIcon: () => setIconFolder(folder),
      onDelete: () => {
        setDeleteError(null);
        setDeletingFolder(folder);
      },
    };
  }

  const dialogs = (
    <>
      <RenameFolderDialog
        folder={renamingFolder}
        onClose={() => setRenamingFolder(null)}
        onRenamed={() => {
          setRenamingFolder(null);
          onChanged();
        }}
      />
      <ChangeIconDialog
        folder={iconFolder}
        onClose={() => setIconFolder(null)}
        onChanged={() => {
          setIconFolder(null);
          onChanged();
        }}
      />
      <ConfirmationDialog
        open={!!deletingFolder}
        title={`Delete "${deletingFolder?.name}"?`}
        description={deleteError || 'This can only be done once the folder has no notes left in it.'}
        confirmLabel="Delete"
        onClose={() => setDeletingFolder(null)}
        onConfirm={async () => {
          if (!deletingFolder) return;
          try {
            await window.dashboard.deleteFolder(deletingFolder.id);
            toast.show('Folder deleted');
            setDeletingFolder(null);
            onChanged();
          } catch (err) {
            setDeleteError((err as Error).message);
          }
        }}
      />
    </>
  );

  return { getActions, dialogs };
}

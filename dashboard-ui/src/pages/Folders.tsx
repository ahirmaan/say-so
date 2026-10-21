import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import FolderCard from '../components/FolderCard';
import EmptyState from '../components/EmptyState';
import CreateFolderDialog from '../components/CreateFolderDialog';
import type { Folder } from '../lib/types';
import { useFolderActions } from '../lib/useFolderActions';

export default function Folders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setFolders(await window.dashboard.listFolders());
  }

  useEffect(() => {
    load();
  }, []);

  const { getActions, dialogs } = useFolderActions(load);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Your Folders</h2>
          <p className="text-sm text-text-secondary">Keep everything organized.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <Plus size={15} /> Create Folder
        </button>
      </div>

      {folders.length === 0 ? (
        <EmptyState title="No folders yet." description="Create your first folder to start organizing." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {folders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} {...getActions(folder)} />
          ))}
        </div>
      )}

      {dialogs}
      <CreateFolderDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';
import AllNotes from './pages/AllNotes';
import Folders from './pages/Folders';
import FolderDetail from './pages/FolderDetail';
import Favorites from './pages/Favorites';
import RecentActivity from './pages/RecentActivity';
import NoteDetail from './pages/NoteDetail';
import Settings from './pages/Settings';
import { ToastProvider } from './lib/toast';
import type { Folder } from './lib/types';

const ROUTE_META: { test: (p: string) => boolean; title: string }[] = [
  { test: (p) => p === '/', title: 'Overview' },
  { test: (p) => p === '/notes', title: 'All Notes' },
  { test: (p) => p === '/folders', title: 'My Folders' },
  { test: (p) => /^\/folders\/\d+$/.test(p), title: 'Folder' },
  { test: (p) => p === '/favorites', title: 'Favorites' },
  { test: (p) => p === '/activity', title: 'Recent Activity' },
  { test: (p) => /^\/notes\/\d+$/.test(p), title: 'Note' },
  { test: (p) => p === '/settings', title: 'Settings' },
];

function TopbarForRoute() {
  const location = useLocation();
  const meta = ROUTE_META.find((r) => r.test(location.pathname));
  return <Topbar title={meta?.title ?? 'Say.so'} />;
}

function DefaultRedirect() {
  const target = localStorage.getItem('default-landing-page') || '/';
  if (target === '/') return <Overview />;
  return <Navigate to={target} replace />;
}

function Shell() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');

  async function refreshFolders() {
    try {
      const data = await window.dashboard.listFolders();
      setFolders(data);
      setDbStatus('connected');
    } catch {
      setDbStatus('error');
    }
  }

  useEffect(() => {
    refreshFolders();
    const interval = window.setInterval(refreshFolders, 15000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar folders={folders} dbStatus={dbStatus} onFoldersChanged={refreshFolders} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopbarForRoute />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/notes" element={<AllNotes />} />
            <Route path="/folders" element={<Folders />} />
            <Route path="/folders/:id" element={<FolderDetail />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/activity" element={<RecentActivity />} />
            <Route path="/notes/:id" element={<NoteDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </HashRouter>
  );
}

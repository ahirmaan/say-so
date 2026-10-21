import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  FileText,
  FolderClosed,
  Star,
  Clock,
  Plus,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronsLeft,
  ChevronsRight,
  Circle,
} from 'lucide-react';
import type { Folder } from '../lib/types';
import { resolveFolderIcon } from '../lib/folderIcons';
import CreateFolderDialog from './CreateFolderDialog';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/notes', label: 'All Notes', icon: FileText },
  { to: '/folders', label: 'My Folders', icon: FolderClosed },
  { to: '/favorites', label: 'Favorites', icon: Star },
  { to: '/activity', label: 'Recent Activity', icon: Clock },
];

interface SidebarProps {
  folders: Folder[];
  dbStatus: 'connected' | 'error';
  onFoldersChanged: () => void;
}

export default function Sidebar({ folders, dbStatus, onFoldersChanged }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'bg-accent/15 text-text font-medium'
        : 'text-text-secondary hover:bg-elevated hover:text-text'
    }`;

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-all duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && (
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-text">Say.so</div>
            <div className="text-xs text-text-muted">Your second brain.</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-elevated hover:text-text"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={17} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="my-4 border-t border-border" />

      <div className="flex min-h-0 flex-1 flex-col px-3">
        {!collapsed && (
          <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Your Folders
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {folders.map((folder) => {
            const Icon = resolveFolderIcon(folder.name, folder.icon);
            return (
              <NavLink
                key={folder.id}
                to={`/folders/${folder.id}`}
                className={({ isActive }) => linkClass(isActive)}
                title={collapsed ? folder.name : undefined}
              >
                <Icon size={16} className="shrink-0 text-accent" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{folder.name}</span>
                    <span className="text-xs text-text-muted">{folder.fact_count}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className={`mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-text ${
            collapsed ? 'justify-center' : ''
          }`}
          title="New Folder"
        >
          <Plus size={16} />
          {!collapsed && <span>New Folder</span>}
        </button>
      </div>

      <div className="mt-auto border-t border-border px-3 py-3">
        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive)} title={collapsed ? 'Settings' : undefined}>
          <SettingsIcon size={16} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <a
          href="#/settings?tab=shortcuts"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-text"
          title={collapsed ? 'Help & Shortcuts' : undefined}
        >
          <HelpCircle size={16} />
          {!collapsed && <span>Help & Shortcuts</span>}
        </a>

        <div
          className={`mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted ${
            collapsed ? 'justify-center' : ''
          }`}
          title={dbStatus === 'connected' ? 'Database connected' : 'Database error'}
        >
          <Circle
            size={8}
            className={dbStatus === 'connected' ? 'fill-success text-success' : 'fill-error text-error'}
          />
          {!collapsed && <span>{dbStatus === 'connected' ? 'Synced' : 'Connection error'}</span>}
        </div>
      </div>

      <CreateFolderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          onFoldersChanged();
        }}
      />
    </aside>
  );
}

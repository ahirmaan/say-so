import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Monitor, PanelLeft, Home, FolderCog, ListOrdered, Download, Database, Shield, Info, Keyboard, Zap } from 'lucide-react';
import { useToast } from '../lib/toast';

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'knowledge', label: 'Knowledge Management' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'application', label: 'Application' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const LANDING_PAGES = [
  { value: '/', label: 'Overview' },
  { value: '/notes', label: 'All Notes' },
  { value: '/folders', label: 'My Folders' },
  { value: '/favorites', label: 'Favorites' },
];

function Row({ icon: Icon, label, control, hint }: { icon: any; label: string; control: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-3.5 last:border-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon size={15} className="shrink-0 text-text-muted" />
        <div className="min-w-0">
          <div className="text-sm text-text">{label}</div>
          {hint && <div className="text-xs text-text-muted">{hint}</div>}
        </div>
      </div>
      <div className="shrink-0 text-right">{control}</div>
    </div>
  );
}

function NotSupported() {
  return <span className="text-xs text-text-muted">Not yet supported</span>;
}

export default function Settings() {
  const [params] = useSearchParams();
  const [section, setSection] = useState<SectionId>(
    (params.get('tab') as SectionId) in { general: 1, knowledge: 1, privacy: 1, application: 1 }
      ? (params.get('tab') as SectionId)
      : 'general'
  );
  const [collapsed, setCollapsed] = useState(localStorage.getItem('sidebar-collapsed') === '1');
  const [landingPage, setLandingPage] = useState(localStorage.getItem('default-landing-page') || '/');
  const [appInfo, setAppInfo] = useState<{ version: string; dbPath: string } | null>(null);
  const toast = useToast();

  useEffect(() => {
    window.dashboard.getAppInfo().then(setAppInfo);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
    window.dispatchEvent(new Event('storage'));
  }

  function changeLandingPage(value: string) {
    setLandingPage(value);
    localStorage.setItem('default-landing-page', value);
  }

  async function handleExport() {
    const result = await window.dashboard.exportData();
    if (result.exported) toast.show(`Exported to ${result.filePath}`);
  }

  return (
    <div className="mx-auto flex max-w-4xl gap-8 px-6 py-6">
      <nav className="w-44 shrink-0">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              section === s.id ? 'bg-accent/15 text-text font-medium' : 'text-text-secondary hover:bg-card hover:text-text'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        {section === 'general' && (
          <div className="rounded-card border border-border bg-card px-5">
            <Row
              icon={Monitor}
              label="Theme"
              hint="Dark theme is the only option right now"
              control={<span className="text-xs text-text-muted">Dark</span>}
            />
            <Row
              icon={PanelLeft}
              label="Collapse sidebar"
              control={
                <button
                  onClick={toggleCollapsed}
                  className={`h-5 w-9 rounded-full transition-colors ${collapsed ? 'bg-accent' : 'bg-elevated'}`}
                >
                  <span
                    className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform ${
                      collapsed ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              }
            />
            <Row
              icon={Home}
              label="Default landing page"
              control={
                <select
                  value={landingPage}
                  onChange={(e) => changeLandingPage(e.target.value)}
                  className="rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-text-secondary"
                >
                  {LANDING_PAGES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              }
            />
          </div>
        )}

        {section === 'knowledge' && (
          <div className="rounded-card border border-border bg-card px-5">
            <Row
              icon={FolderCog}
              label="Default folder for new facts"
              hint="Say.so's AI routes new facts automatically based on their content"
              control={<NotSupported />}
            />
            <Row
              icon={ListOrdered}
              label="Note display / sort preferences"
              hint="Each page remembers its view while open, but a persisted global default isn't implemented yet"
              control={<NotSupported />}
            />
            <Row
              icon={Download}
              label="Export data"
              hint="Download every folder and note as a JSON file"
              control={
                <button
                  onClick={handleExport}
                  className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs text-text-secondary hover:text-text"
                >
                  Export
                </button>
              }
            />
          </div>
        )}

        {section === 'privacy' && (
          <div className="rounded-card border border-border bg-card px-5">
            <Row
              icon={Database}
              label="Data storage"
              hint={appInfo ? appInfo.dbPath : 'Local SQLite database - never leaves this machine'}
              control={<span className="text-xs text-success">Local only</span>}
            />
            <Row
              icon={Download}
              label="Export your data"
              control={
                <button
                  onClick={handleExport}
                  className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs text-text-secondary hover:text-text"
                >
                  Export
                </button>
              }
            />
            <Row
              icon={Shield}
              label="Delete all data"
              hint="Delete individual notes/folders from the Notes or Folders pages - a full wipe isn't available here"
              control={<NotSupported />}
            />
          </div>
        )}

        {section === 'application' && (
          <div className="rounded-card border border-border bg-card px-5">
            <Row icon={Info} label="Version" control={<span className="text-xs text-text-muted">{appInfo?.version ?? '—'}</span>} />
            <Row
              icon={Zap}
              label="Say.so assistant"
              hint="Reads and writes the same local database as this dashboard"
              control={<span className="text-xs text-success">Connected</span>}
            />
            <div className="py-3.5">
              <div className="mb-2 flex items-center gap-2.5">
                <Keyboard size={15} className="text-text-muted" />
                <span className="text-sm text-text">Keyboard shortcuts</span>
              </div>
              <div className="ml-7 space-y-1.5 text-xs text-text-secondary">
                <div>
                  <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5">F9</kbd> — start talking to
                  Say.so (auto-stops when you stop talking)
                </div>
                <div>
                  <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5">F9</kbd> again — stop early /
                  manual override
                </div>
                <div>
                  <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5">Ctrl K</kbd> — focus search in
                  this dashboard
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

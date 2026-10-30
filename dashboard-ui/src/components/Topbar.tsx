import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import SearchField from './SearchField';
import type { Note } from '../lib/types';
import { formatRelativeTime } from '../lib/format';

interface TopbarProps {
  title: string;
  description?: string;
}

export default function Topbar({ title, description }: TopbarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    window.dashboard.listFacts({ search: query, limit: 6, sort: 'recent_updated' }).then((res) => {
      if (!cancelled) {
        setResults(res.rows);
        setOpen(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputWrapRef.current?.querySelector('input')?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg px-6">
      <div>
        <h1 className="text-[15px] font-semibold text-text">{title}</h1>
        {description && <p className="text-xs text-text-secondary">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div ref={inputWrapRef} className="relative w-72">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search your knowledge..."
            shortcutHint="Ctrl K"
            autoFocus={false}
          />
          {open && (
            <div className="absolute right-0 top-11 z-40 w-96 overflow-hidden rounded-card border border-border bg-elevated shadow-xl">
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-text-muted">No matches found.</div>
              ) : (
                <ul>
                  {results.map((note) => (
                    <li key={note.id}>
                      <button
                        onClick={() => {
                          navigate(`/notes/${note.id}`);
                          setOpen(false);
                          setQuery('');
                        }}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-card"
                      >
                        <span className="line-clamp-1 text-sm text-text">
                          {note.content || note.raw_transcript}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-text-muted">
                          <span className="text-accent-cyan">{note.folder_name}</span>
                          <span>&middot;</span>
                          <span>{formatRelativeTime(note.updated_at)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-text-secondary transition-colors hover:text-text"
            aria-label="Profile"
          >
            <User size={16} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-10 z-40 w-44 rounded-card border border-border bg-elevated py-1 shadow-xl">
              <div className="border-b border-border px-3 py-2 text-xs text-text-muted">Local account</div>
              <a
                href="#/settings"
                className="block px-3 py-2 text-sm text-text-secondary hover:bg-card hover:text-text"
                onClick={() => setProfileOpen(false)}
              >
                Settings
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

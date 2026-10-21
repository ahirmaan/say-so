import { useEffect, useState } from 'react';
import ActivityItem from '../components/ActivityItem';
import EmptyState from '../components/EmptyState';
import type { ActivityEntry } from '../lib/types';

export default function RecentActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.dashboard.listActivity(100).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-text">Recent Activity</h2>
        <p className="text-sm text-text-secondary">Everything that's happened across your knowledge base.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-card bg-card" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No activity yet."
          description="As you save facts and organize folders with Say.so, that activity will show up here."
          showHotkeyHint
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-card">
          {entries.map((entry) => (
            <ActivityItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

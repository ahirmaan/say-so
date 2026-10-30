import type { DashboardBridge, Folder, Note, ActivityEntry, ListFactsOptions } from './types';

// Lets the dashboard render in a plain browser (no Electron preload) for UI
// development/QA - this NEVER activates inside the real app, since
// window.dashboard already exists there via preload-dashboard.js. See
// main.tsx: only installed when window.dashboard is undefined.

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString().slice(0, 19).replace('T', ' ');

let mockFolders: Folder[] = [
  { id: 1, name: 'Ideas', icon: null, description: 'Product and project ideas worth revisiting', created_at: hoursAgo(400), fact_count: 0, last_activity_at: null },
  { id: 2, name: 'Decisions', icon: null, description: null, created_at: hoursAgo(400), fact_count: 0, last_activity_at: null },
  { id: 3, name: 'Random', icon: null, description: null, created_at: hoursAgo(400), fact_count: 0, last_activity_at: null },
  { id: 4, name: 'DevFest 2026', icon: 'rocket', description: 'Everything about the Ahmedabad DevFest trip', created_at: hoursAgo(100), fact_count: 0, last_activity_at: null },
  { id: 5, name: 'Learning', icon: 'book', description: 'Things I’m studying right now', created_at: hoursAgo(80), fact_count: 0, last_activity_at: null },
];

let mockFacts: Note[] = [
  { id: 1, content: 'I am going to DevFest 2026 on the 1st of November.', raw_transcript: 'Could you please store the fact that I am going to DevFest 2026 on the 1st of November?', favorite: 1, created_at: hoursAgo(90), updated_at: hoursAgo(90), folder_id: 4, folder_name: 'DevFest 2026' },
  { id: 2, content: 'Decided to use SQLite over Postgres for the auth service since it is local-first and needs no server.', raw_transcript: 'save this: we decided to use sqlite over postgres for the auth service, local first, no server needed', favorite: 0, created_at: hoursAgo(72), updated_at: hoursAgo(72), folder_id: 2, folder_name: 'Decisions' },
  { id: 3, content: 'Quantum computing uses qubits that can exist in superpositions, enabling speedups for problems like factoring and molecular simulation.', raw_transcript: "I'm researching quantum computing and want to know more about this", favorite: 1, created_at: hoursAgo(48), updated_at: hoursAgo(2), folder_id: 5, folder_name: 'Learning' },
  { id: 4, content: 'A voice-first productivity app for musicians that transcribes practice session notes automatically.', raw_transcript: 'remember this idea, a voice first productivity app for musicians, transcribes practice notes automatically', favorite: 0, created_at: hoursAgo(36), updated_at: hoursAgo(36), folder_id: 1, folder_name: 'Ideas' },
  { id: 5, content: 'Octopuses have three hearts and blue, copper-based blood.', raw_transcript: 'tell me something interesting about octopuses', favorite: 0, created_at: hoursAgo(20), updated_at: hoursAgo(20), folder_id: 3, folder_name: 'Random' },
  { id: 6, content: 'Pitch deck should lead with the live demo, not the architecture slide.', raw_transcript: 'decision - pitch deck should lead with the live demo not the architecture slide', favorite: 1, created_at: hoursAgo(5), updated_at: hoursAgo(5), folder_id: 2, folder_name: 'Decisions' },
  { id: 7, content: 'Buy a proper tripod before recording the demo video.', raw_transcript: 'remind myself to buy a proper tripod before recording the demo video', favorite: 0, created_at: hoursAgo(2), updated_at: hoursAgo(2), folder_id: 3, folder_name: 'Random' },
];

let mockActivity: ActivityEntry[] = [
  { id: 7, type: 'fact_created', description: 'Saved to Random: Buy a proper tripod before recording the demo video.', created_at: hoursAgo(2), fact_id: 7, folder_id: 3, folder_name: 'Random' },
  { id: 6, type: 'fact_favorited', description: 'Added to favorites: Pitch deck should lead with the live demo, not the architecture slide.', created_at: hoursAgo(5), fact_id: 6, folder_id: 2, folder_name: 'Decisions' },
  { id: 5, type: 'fact_created', description: 'Saved to Decisions: Pitch deck should lead with the live demo, not the architecture slide.', created_at: hoursAgo(5), fact_id: 6, folder_id: 2, folder_name: 'Decisions' },
  { id: 4, type: 'fact_updated', description: 'Note updated: Quantum computing uses qubits that can exist in superpositions...', created_at: hoursAgo(2), fact_id: 3, folder_id: 5, folder_name: 'Learning' },
  { id: 3, type: 'folder_created', description: 'Folder "Learning" created', created_at: hoursAgo(80), fact_id: null, folder_id: 5, folder_name: 'Learning' },
  { id: 2, type: 'fact_moved', description: 'Note moved to Ideas: A voice-first productivity app for musicians...', created_at: hoursAgo(36), fact_id: 4, folder_id: 1, folder_name: 'Ideas' },
  { id: 1, type: 'folder_renamed', description: 'Folder "Devfast 2026" renamed to "DevFest 2026"', created_at: hoursAgo(90), fact_id: null, folder_id: 4, folder_name: 'DevFest 2026' },
];

function recomputeFolderCounts() {
  mockFolders = mockFolders.map((f) => {
    const inFolder = mockFacts.filter((n) => n.folder_id === f.id);
    const last = inFolder.reduce<string | null>((latest, n) => (!latest || n.created_at > latest ? n.created_at : latest), null);
    return { ...f, fact_count: inFolder.length, last_activity_at: last };
  });
}
recomputeFolderCounts();

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockDashboard: DashboardBridge = {
  async getOverviewStats() {
    return delay({
      totalFacts: mockFacts.length,
      totalFolders: mockFolders.length,
      favorites: mockFacts.filter((n) => n.favorite).length,
      addedToday: mockFacts.filter((n) => n.created_at > hoursAgo(24)).length,
    });
  },

  async listFolders() {
    return delay([...mockFolders].sort((a, b) => a.name.localeCompare(b.name)));
  },
  async createFolder(name, icon = null, description = null) {
    const folder: Folder = {
      id: Math.max(0, ...mockFolders.map((f) => f.id)) + 1,
      name,
      icon,
      description,
      created_at: hoursAgo(0),
      fact_count: 0,
      last_activity_at: null,
    };
    mockFolders.push(folder);
    return delay(folder);
  },
  async renameFolder(id, name) {
    mockFolders = mockFolders.map((f) => (f.id === id ? { ...f, name } : f));
    mockFacts = mockFacts.map((n) => (n.folder_id === id ? { ...n, folder_name: name } : n));
    return delay(mockFolders.find((f) => f.id === id)!);
  },
  async deleteFolder(id) {
    const count = mockFacts.filter((n) => n.folder_id === id).length;
    if (count > 0) throw new Error(`Folder still has ${count} note(s) - move or delete them first`);
    mockFolders = mockFolders.filter((f) => f.id !== id);
    return delay(undefined);
  },
  async setFolderIcon(id, icon) {
    mockFolders = mockFolders.map((f) => (f.id === id ? { ...f, icon } : f));
    return delay(mockFolders.find((f) => f.id === id)!);
  },
  async setFolderDescription(id, description) {
    mockFolders = mockFolders.map((f) => (f.id === id ? { ...f, description } : f));
    return delay(mockFolders.find((f) => f.id === id)!);
  },

  async listFacts(opts: ListFactsOptions = {}) {
    let rows = [...mockFacts];
    if (opts.folderId) rows = rows.filter((n) => n.folder_id === opts.folderId);
    if (opts.favoritesOnly) rows = rows.filter((n) => n.favorite);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      rows = rows.filter(
        (n) => n.content.toLowerCase().includes(q) || n.raw_transcript.toLowerCase().includes(q) || n.folder_name.toLowerCase().includes(q)
      );
    }
    switch (opts.sort) {
      case 'alphabetical':
        rows.sort((a, b) => a.content.localeCompare(b.content));
        break;
      case 'oldest':
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case 'recent_updated':
        rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        break;
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const total = rows.length;
    if (opts.limit) rows = rows.slice(opts.offset || 0, (opts.offset || 0) + opts.limit);
    return delay({ rows, total });
  },
  async getFact(id) {
    const fact = mockFacts.find((n) => n.id === id);
    if (!fact) throw new Error('Not found');
    return delay(fact);
  },
  async updateFactContent(id, content) {
    mockFacts = mockFacts.map((n) => (n.id === id ? { ...n, content, updated_at: hoursAgo(0) } : n));
    return delay(mockFacts.find((n) => n.id === id)!);
  },
  async setFactFavorite(id, favorite) {
    mockFacts = mockFacts.map((n) => (n.id === id ? { ...n, favorite: favorite ? 1 : 0 } : n));
    recomputeFolderCounts();
    return delay(mockFacts.find((n) => n.id === id)!);
  },
  async moveFact(id, folderId) {
    const folder = mockFolders.find((f) => f.id === folderId)!;
    mockFacts = mockFacts.map((n) => (n.id === id ? { ...n, folder_id: folderId, folder_name: folder.name } : n));
    recomputeFolderCounts();
    return delay(mockFacts.find((n) => n.id === id)!);
  },
  async deleteFact(id) {
    mockFacts = mockFacts.filter((n) => n.id !== id);
    recomputeFolderCounts();
    return delay(undefined);
  },

  async bulkMove(ids, folderId) {
    const folder = mockFolders.find((f) => f.id === folderId)!;
    mockFacts = mockFacts.map((n) => (ids.includes(n.id) ? { ...n, folder_id: folderId, folder_name: folder.name } : n));
    recomputeFolderCounts();
    return delay(undefined);
  },
  async bulkFavorite(ids, favorite) {
    mockFacts = mockFacts.map((n) => (ids.includes(n.id) ? { ...n, favorite: favorite ? 1 : 0 } : n));
    return delay(undefined);
  },
  async bulkDelete(ids) {
    mockFacts = mockFacts.filter((n) => !ids.includes(n.id));
    recomputeFolderCounts();
    return delay(undefined);
  },

  async listActivity(limit = 50) {
    return delay([...mockActivity].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
  },

  async getAppInfo() {
    return delay({ version: '0.1.0', dbPath: '(mock - no real database in UI preview mode)' });
  },
  async exportData() {
    return delay({ exported: false });
  },
};

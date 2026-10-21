export interface Folder {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  created_at: string;
  fact_count: number;
  last_activity_at: string | null;
}

export interface Note {
  id: number;
  content: string;
  raw_transcript: string;
  favorite: number; // SQLite boolean (0/1)
  created_at: string;
  updated_at: string;
  folder_id: number;
  folder_name: string;
}

export interface ActivityEntry {
  id: number;
  type: string;
  description: string;
  created_at: string;
  fact_id: number | null;
  folder_id: number | null;
  folder_name: string | null;
}

export interface OverviewStats {
  totalFacts: number;
  totalFolders: number;
  favorites: number;
  addedToday: number;
}

export type SortOption = 'recent_added' | 'recent_updated' | 'alphabetical' | 'oldest';

export interface ListFactsOptions {
  folderId?: number;
  favoritesOnly?: boolean;
  search?: string;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

export interface ListFactsResult {
  rows: Note[];
  total: number;
}

// The shape exposed on window by electron/preload-dashboard.js.
export interface DashboardBridge {
  getOverviewStats(): Promise<OverviewStats>;

  listFolders(): Promise<Folder[]>;
  createFolder(name: string, icon?: string | null, description?: string | null): Promise<Folder>;
  renameFolder(id: number, name: string): Promise<Folder>;
  deleteFolder(id: number): Promise<void>;
  setFolderIcon(id: number, icon: string): Promise<Folder>;
  setFolderDescription(id: number, description: string): Promise<Folder>;

  listFacts(opts?: ListFactsOptions): Promise<ListFactsResult>;
  getFact(id: number): Promise<Note>;
  updateFactContent(id: number, content: string): Promise<Note>;
  setFactFavorite(id: number, favorite: boolean): Promise<Note>;
  moveFact(id: number, folderId: number): Promise<Note>;
  deleteFact(id: number): Promise<void>;

  bulkMove(ids: number[], folderId: number): Promise<void>;
  bulkFavorite(ids: number[], favorite: boolean): Promise<void>;
  bulkDelete(ids: number[]): Promise<void>;

  listActivity(limit?: number): Promise<ActivityEntry[]>;

  getAppInfo(): Promise<{ version: string; dbPath: string }>;
  exportData(): Promise<{ exported: boolean; filePath?: string }>;
}

declare global {
  interface Window {
    dashboard: DashboardBridge;
  }
}

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

let db;

function getDbPath() {
  const dir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'sayso.db');
}

function columnExists(table, column) {
  return getDb()
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === column);
}

function initDb() {
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      raw_transcript TEXT NOT NULL,
      folder_id INTEGER NOT NULL REFERENCES folders(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      fact_id INTEGER REFERENCES facts(id) ON DELETE SET NULL,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Additive migrations for databases created before these columns existed.
  if (!columnExists('facts', 'favorite')) {
    db.exec('ALTER TABLE facts ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0');
  }
  if (!columnExists('facts', 'updated_at')) {
    // SQLite won't allow a function (datetime('now')) as an ADD COLUMN
    // default - add it plain, then backfill from created_at.
    db.exec('ALTER TABLE facts ADD COLUMN updated_at TEXT');
    db.exec('UPDATE facts SET updated_at = created_at WHERE updated_at IS NULL');
  }
  if (!columnExists('folders', 'icon')) {
    // Nullable - null means "auto-pick one based on the name" (see the
    // dashboard's folderIcon() helper), non-null means the user explicitly
    // chose one via the icon picker.
    db.exec('ALTER TABLE folders ADD COLUMN icon TEXT');
  }
  if (!columnExists('folders', 'description')) {
    db.exec('ALTER TABLE folders ADD COLUMN description TEXT');
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized — call initDb() first');
  return db;
}

function logActivity(type, description, { factId = null, folderId = null } = {}) {
  getDb()
    .prepare(
      'INSERT INTO activity (type, description, fact_id, folder_id) VALUES (?, ?, ?, ?)'
    )
    .run(type, description, factId, folderId);
}

// --- Folders -----------------------------------------------------------

const FOLDER_COLUMNS = 'id, name, icon, description, created_at';

function listFolders() {
  return getDb().prepare(`SELECT ${FOLDER_COLUMNS} FROM folders ORDER BY name`).all();
}

function listFoldersWithCounts() {
  return getDb()
    .prepare(
      `SELECT folders.id, folders.name, folders.icon, folders.description, folders.created_at,
              COUNT(facts.id) AS fact_count,
              MAX(facts.created_at) AS last_activity_at
       FROM folders
       LEFT JOIN facts ON facts.folder_id = folders.id
       GROUP BY folders.id
       ORDER BY folders.name`
    )
    .all();
}

function getFolder(id) {
  return getDb().prepare(`SELECT ${FOLDER_COLUMNS} FROM folders WHERE id = ?`).get(id);
}

function findFolderByName(name) {
  return getDb()
    .prepare(`SELECT ${FOLDER_COLUMNS} FROM folders WHERE name = ? COLLATE NOCASE`)
    .get(name);
}

function setFolderIcon(id, icon) {
  getDb().prepare('UPDATE folders SET icon = ? WHERE id = ?').run(icon, id);
  return getFolder(id);
}

function setFolderDescription(id, description) {
  getDb().prepare('UPDATE folders SET description = ? WHERE id = ?').run(description, id);
  return getFolder(id);
}

function createFolder(name, { icon = null, description = null } = {}) {
  const existing = findFolderByName(name);
  if (existing) return existing;
  const { lastInsertRowid } = getDb()
    .prepare('INSERT INTO folders (name, icon, description) VALUES (?, ?, ?)')
    .run(name, icon, description);
  const folder = getFolder(lastInsertRowid);
  logActivity('folder_created', `Folder "${folder.name}" created`, { folderId: folder.id });
  return folder;
}

function renameFolder(id, name) {
  const folder = getFolder(id);
  if (!folder) throw new Error(`Folder ${id} not found`);
  getDb().prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id);
  logActivity('folder_renamed', `Folder "${folder.name}" renamed to "${name}"`, { folderId: id });
  return getFolder(id);
}

function deleteFolder(id) {
  const folder = getFolder(id);
  if (!folder) return;
  const factCount = getDb().prepare('SELECT COUNT(*) AS n FROM facts WHERE folder_id = ?').get(id).n;
  if (factCount > 0) {
    throw new Error(`Folder "${folder.name}" still has ${factCount} note(s) - move or delete them first`);
  }
  getDb().prepare('DELETE FROM folders WHERE id = ?').run(id);
  logActivity('folder_deleted', `Folder "${folder.name}" deleted`);
}

function recentFactsForFolder(folderId, limit = 5) {
  return getDb()
    .prepare('SELECT content FROM facts WHERE folder_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(folderId, limit);
}

// --- Facts ---------------------------------------------------------------

function createFact({ content, rawTranscript, folderId }) {
  const { lastInsertRowid } = getDb()
    .prepare('INSERT INTO facts (content, raw_transcript, folder_id) VALUES (?, ?, ?)')
    .run(content, rawTranscript, folderId);
  const fact = getDb().prepare('SELECT * FROM facts WHERE id = ?').get(lastInsertRowid);
  const folder = getFolder(folderId);
  logActivity('fact_created', `Saved to ${folder ? folder.name : 'a folder'}: ${content}`, {
    factId: fact.id,
    folderId,
  });
  return fact;
}

const FACT_SELECT = `
  SELECT facts.id, facts.content, facts.raw_transcript, facts.favorite,
         facts.created_at, facts.updated_at,
         facts.folder_id, folders.name AS folder_name
  FROM facts
  JOIN folders ON folders.id = facts.folder_id
`;

const SORTS = {
  recent_added: 'facts.created_at DESC',
  recent_updated: 'facts.updated_at DESC',
  alphabetical: 'facts.content COLLATE NOCASE ASC',
  oldest: 'facts.created_at ASC',
};

function listFacts({ folderId, favoritesOnly, search, sort = 'recent_added', limit = 200, offset = 0 } = {}) {
  const clauses = [];
  const params = [];

  if (folderId) {
    clauses.push('facts.folder_id = ?');
    params.push(folderId);
  }
  if (favoritesOnly) {
    clauses.push('facts.favorite = 1');
  }
  if (search) {
    clauses.push('(facts.content LIKE ? OR facts.raw_transcript LIKE ? OR folders.name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orderBy = SORTS[sort] || SORTS.recent_added;

  const rows = getDb()
    .prepare(`${FACT_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const total = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM facts JOIN folders ON folders.id = facts.folder_id ${where}`)
    .get(...params).n;

  return { rows, total };
}

function getFact(id) {
  return getDb().prepare(`${FACT_SELECT} WHERE facts.id = ?`).get(id);
}

function updateFactContent(id, content) {
  getDb()
    .prepare("UPDATE facts SET content = ?, updated_at = datetime('now') WHERE id = ?")
    .run(content, id);
  logActivity('fact_updated', `Note updated: ${content}`, { factId: id });
  return getFact(id);
}

function setFactFavorite(id, favorite) {
  const fact = getFact(id);
  if (!fact) return null;
  getDb().prepare('UPDATE facts SET favorite = ? WHERE id = ?').run(favorite ? 1 : 0, id);
  logActivity(
    favorite ? 'fact_favorited' : 'fact_unfavorited',
    `${favorite ? 'Added to' : 'Removed from'} favorites: ${fact.content}`,
    { factId: id }
  );
  return getFact(id);
}

function moveFact(id, folderId) {
  const fact = getFact(id);
  if (!fact) return null;
  const folder = getFolder(folderId);
  if (!folder) throw new Error(`Folder ${folderId} not found`);
  getDb().prepare("UPDATE facts SET folder_id = ?, updated_at = datetime('now') WHERE id = ?").run(folderId, id);
  logActivity('fact_moved', `Note moved to ${folder.name}: ${fact.content}`, { factId: id, folderId });
  return getFact(id);
}

function deleteFact(id) {
  const fact = getFact(id);
  if (!fact) return;
  getDb().prepare('DELETE FROM facts WHERE id = ?').run(id);
  logActivity('fact_deleted', `Note deleted: ${fact.content}`, { folderId: fact.folder_id });
}

// --- Bulk operations -------------------------------------------------------

function bulkMove(ids, folderId) {
  ids.forEach((id) => moveFact(id, folderId));
}

function bulkFavorite(ids, favorite) {
  ids.forEach((id) => setFactFavorite(id, favorite));
}

function bulkDelete(ids) {
  ids.forEach((id) => deleteFact(id));
}

// --- Activity / stats ------------------------------------------------------

function listActivity(limit = 50) {
  return getDb()
    .prepare(
      `SELECT activity.id, activity.type, activity.description, activity.created_at,
              facts.id AS fact_id, folders.id AS folder_id, folders.name AS folder_name
       FROM activity
       LEFT JOIN facts ON facts.id = activity.fact_id
       LEFT JOIN folders ON folders.id = COALESCE(activity.folder_id, facts.folder_id)
       ORDER BY activity.created_at DESC, activity.id DESC
       LIMIT ?`
    )
    .all(limit);
}

function getOverviewStats() {
  const totalFacts = getDb().prepare('SELECT COUNT(*) AS n FROM facts').get().n;
  const totalFolders = getDb().prepare('SELECT COUNT(*) AS n FROM folders').get().n;
  const favorites = getDb().prepare('SELECT COUNT(*) AS n FROM facts WHERE favorite = 1').get().n;
  const addedToday = getDb()
    .prepare("SELECT COUNT(*) AS n FROM facts WHERE date(created_at) = date('now')")
    .get().n;
  return { totalFacts, totalFolders, favorites, addedToday };
}

module.exports = {
  initDb,
  getDb,
  listFolders,
  listFoldersWithCounts,
  getFolder,
  findFolderByName,
  createFolder,
  renameFolder,
  deleteFolder,
  setFolderIcon,
  setFolderDescription,
  recentFactsForFolder,
  createFact,
  listFacts,
  getFact,
  updateFactContent,
  setFactFavorite,
  moveFact,
  deleteFact,
  bulkMove,
  bulkFavorite,
  bulkDelete,
  listActivity,
  getOverviewStats,
};

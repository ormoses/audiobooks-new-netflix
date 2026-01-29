// Database schema definitions
// This file is server-only

export const SCHEMA_VERSION = 1;

// Individual table creation statements
export const createBooksTableSQL = `
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  series TEXT,
  series_book_number REAL,
  narrator TEXT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'finished')),
  rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`;

export const createAppMetaTableSQL = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
)`;

export const createNarratorRatingsTableSQL = `
CREATE TABLE IF NOT EXISTS narrator_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  narrator_name TEXT NOT NULL,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  UNIQUE(book_id, narrator_name)
)`;

// Index creation statements
export const createIndexesSQL = [
  'CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)',
  'CREATE INDEX IF NOT EXISTS idx_books_series ON books(series)',
  'CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)',
  'CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating)',
];

// Meta initialization statements
export const initializeMetaSQL = [
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')`,
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_import', NULL)`,
];

// All schema statements in order
export const allSchemaStatements = [
  createBooksTableSQL,
  createAppMetaTableSQL,
  createNarratorRatingsTableSQL,
  ...createIndexesSQL,
];

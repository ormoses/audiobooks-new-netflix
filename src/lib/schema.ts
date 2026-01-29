// Database schema definitions
// This file is server-only

export const SCHEMA_VERSION = 2;

// Books table - full schema for CSV import
export const createBooksTableSQL = `
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Folder', 'SingleFile')),
  title TEXT NOT NULL,
  author TEXT,
  narrator TEXT,
  duration_seconds INTEGER,
  has_embedded_cover INTEGER,
  total_size_bytes INTEGER,
  file_count INTEGER,
  is_duplicate INTEGER,
  series TEXT,
  series_book_number TEXT,
  series_ended INTEGER,
  series_name_raw TEXT,
  series_exact_name_raw TEXT,
  source TEXT DEFAULT 'csv',
  date_added TEXT DEFAULT CURRENT_TIMESTAMP,
  date_updated TEXT DEFAULT CURRENT_TIMESTAMP
)`;

// App metadata table
export const createAppMetaTableSQL = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
)`;

// Narrator ratings table (for Step 3)
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
  'CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)',
  'CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)',
  'CREATE INDEX IF NOT EXISTS idx_books_series ON books(series)',
  'CREATE INDEX IF NOT EXISTS idx_books_narrator ON books(narrator)',
  'CREATE INDEX IF NOT EXISTS idx_books_is_duplicate ON books(is_duplicate)',
];

// Meta initialization statements
export const initializeMetaSQL = [
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')`,
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_import_at', NULL)`,
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_csv_path', NULL)`,
];

// All schema statements in order
export const allSchemaStatements = [
  createBooksTableSQL,
  createAppMetaTableSQL,
  createNarratorRatingsTableSQL,
  ...createIndexesSQL,
];

// Migration: Add columns that might be missing from Step 1 schema
// These are safe to run even if columns already exist (SQLite will error, which we catch)
export const migrationColumns = [
  { table: 'books', column: 'type', definition: 'TEXT DEFAULT \'Folder\'' },
  { table: 'books', column: 'narrator', definition: 'TEXT' },
  { table: 'books', column: 'has_embedded_cover', definition: 'INTEGER' },
  { table: 'books', column: 'total_size_bytes', definition: 'INTEGER' },
  { table: 'books', column: 'file_count', definition: 'INTEGER' },
  { table: 'books', column: 'is_duplicate', definition: 'INTEGER' },
  { table: 'books', column: 'series_book_number', definition: 'TEXT' },
  { table: 'books', column: 'series_ended', definition: 'INTEGER' },
  { table: 'books', column: 'series_name_raw', definition: 'TEXT' },
  { table: 'books', column: 'series_exact_name_raw', definition: 'TEXT' },
  { table: 'books', column: 'source', definition: 'TEXT DEFAULT \'csv\'' },
  { table: 'books', column: 'date_added', definition: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
  { table: 'books', column: 'date_updated', definition: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
];

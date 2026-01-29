// Database schema definitions
// This file is server-only

export const SCHEMA_VERSION = 2;

// Books table - full schema for CSV import
export const createBooksTableSQL = `
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'Folder' CHECK(type IN ('Folder', 'SingleFile')),
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

// Table creation statements (run first, before migrations)
export const createTablesSQL = [
  createBooksTableSQL,
  createAppMetaTableSQL,
  createNarratorRatingsTableSQL,
];

// Index creation statements (run AFTER migrations ensure columns exist)
export const createIndexesSQL = [
  { sql: 'CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)', column: 'title' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)', column: 'author' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_books_series ON books(series)', column: 'series' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_books_narrator ON books(narrator)', column: 'narrator' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_books_is_duplicate ON books(is_duplicate)', column: 'is_duplicate' },
];

// Meta initialization statements
export const initializeMetaSQL = [
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')`,
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_import_at', NULL)`,
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_csv_path', NULL)`,
];

// Migration: Add columns that might be missing from Step 1 schema
// Each entry specifies the column name and its definition
export const migrationColumns: Array<{ column: string; definition: string }> = [
  { column: 'type', definition: "TEXT NOT NULL DEFAULT 'Folder'" },
  { column: 'narrator', definition: 'TEXT' },
  { column: 'has_embedded_cover', definition: 'INTEGER' },
  { column: 'total_size_bytes', definition: 'INTEGER' },
  { column: 'file_count', definition: 'INTEGER' },
  { column: 'is_duplicate', definition: 'INTEGER' },
  { column: 'series_book_number', definition: 'TEXT' },
  { column: 'series_ended', definition: 'INTEGER' },
  { column: 'series_name_raw', definition: 'TEXT' },
  { column: 'series_exact_name_raw', definition: 'TEXT' },
  { column: 'source', definition: "TEXT DEFAULT 'csv'" },
  { column: 'date_added', definition: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
  { column: 'date_updated', definition: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
];

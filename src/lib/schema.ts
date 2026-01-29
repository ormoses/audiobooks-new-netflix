// Database schema definitions
// This file is server-only

export const SCHEMA_VERSION = 3;

// Valid status values - matches database CHECK constraint
export const BOOK_STATUSES = ['not_started', 'in_progress', 'finished'] as const;
export type BookStatus = typeof BOOK_STATUSES[number];

// Books table - full schema for CSV import + user fields
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
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'finished')),
  book_rating INTEGER CHECK(book_rating IS NULL OR (book_rating >= 1 AND book_rating <= 5)),
  tags TEXT,
  notes TEXT,
  date_added TEXT DEFAULT CURRENT_TIMESTAMP,
  date_updated TEXT DEFAULT CURRENT_TIMESTAMP
)`;

// App metadata table
export const createAppMetaTableSQL = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
)`;

// Narrator ratings table - stores per-narrator ratings for each book
export const createNarratorRatingsTableSQL = `
CREATE TABLE IF NOT EXISTS narrator_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  narrator_name TEXT NOT NULL,
  rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
  { sql: 'CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)', column: 'status' },
  { sql: 'CREATE INDEX IF NOT EXISTS idx_books_book_rating ON books(book_rating)', column: 'book_rating' },
];

// Indexes that don't depend on column checks (for other tables)
export const createOtherIndexesSQL = [
  'CREATE INDEX IF NOT EXISTS idx_narrator_ratings_book_id ON narrator_ratings(book_id)',
];

// Meta initialization statements
export const initializeMetaSQL = [
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}')`,
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_import_at', NULL)`,
  `INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_csv_path', NULL)`,
];

// Migration: Add columns that might be missing from earlier schema versions
export const migrationColumns: Array<{ column: string; definition: string }> = [
  // Step 2 columns
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
  // Step 3 columns
  { column: 'status', definition: "TEXT NOT NULL DEFAULT 'not_started'" },
  { column: 'book_rating', definition: 'INTEGER' },
  { column: 'tags', definition: 'TEXT' },
  { column: 'notes', definition: 'TEXT' },
];

// Migration: Add columns that might be missing from narrator_ratings table
export const narratorRatingsMigrationColumns: Array<{ column: string; definition: string }> = [
  { column: 'created_at', definition: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
  { column: 'updated_at', definition: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
];

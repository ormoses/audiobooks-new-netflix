// Database module - SERVER ONLY
// Do not import this file in client components

import 'server-only';
import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { createTablesSQL, initializeMetaSQL, migrationColumns, createIndexesSQL } from './schema';
import { Book, BookSummary, ImportSummary } from './types';
import { ParsedBook } from './csv-parser';

// Database singleton
let db: Client | null = null;
let schemaInitialized = false;

function getDatabasePath(): string {
  const configPath = process.env.DATABASE_PATH || './data/app.db';
  return path.resolve(process.cwd(), configPath);
}

function ensureDataDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initialize and get database
export function getDatabase(): Client {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  ensureDataDirectory(dbPath);

  db = createClient({
    url: `file:${dbPath}`,
  });

  console.log(`[DB] Database initialized at: ${dbPath}`);

  return db;
}

// Get existing columns for a table
async function getTableColumns(database: Client, tableName: string): Promise<Set<string>> {
  const result = await database.execute(`PRAGMA table_info(${tableName})`);
  const columns = new Set<string>();
  for (const row of result.rows) {
    if (row.name) {
      columns.add(row.name as string);
    }
  }
  return columns;
}

// Initialize schema with proper migration order
export async function initializeSchema(): Promise<void> {
  if (schemaInitialized) {
    return;
  }

  const database = getDatabase();

  // Enable foreign keys
  await database.execute('PRAGMA foreign_keys = ON');

  // Step 1: Create tables (IF NOT EXISTS - safe for existing DBs)
  for (const statement of createTablesSQL) {
    await database.execute(statement);
  }

  // Step 2: Get existing columns in books table
  const existingColumns = await getTableColumns(database, 'books');
  console.log(`[DB] Existing books columns: ${Array.from(existingColumns).join(', ')}`);

  // Step 3: Add missing columns via ALTER TABLE
  for (const migration of migrationColumns) {
    if (!existingColumns.has(migration.column)) {
      try {
        await database.execute(
          `ALTER TABLE books ADD COLUMN ${migration.column} ${migration.definition}`
        );
        existingColumns.add(migration.column); // Track that we added it
        console.log(`[DB] Added column: books.${migration.column}`);
      } catch (error) {
        // Log but continue - column might already exist despite PRAGMA not showing it
        console.log(`[DB] Could not add column ${migration.column}:`, error);
      }
    }
  }

  // Step 4: Create indexes only for columns that exist
  for (const index of createIndexesSQL) {
    if (existingColumns.has(index.column)) {
      try {
        await database.execute(index.sql);
      } catch (error) {
        // Index might already exist, ignore
      }
    } else {
      console.log(`[DB] Skipping index on ${index.column} - column does not exist`);
    }
  }

  // Step 5: Initialize meta data
  for (const statement of initializeMetaSQL) {
    await database.execute(statement);
  }

  schemaInitialized = true;
  console.log('[DB] Schema initialized');
}

// Close database
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    schemaInitialized = false;
    console.log('[DB] Database connection closed');
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await initializeSchema();
    const database = getDatabase();
    const result = await database.execute('SELECT 1 as test');
    if (result.rows.length > 0 && result.rows[0].test === 1) {
      return { ok: true };
    }
    return { ok: false, error: 'Unexpected query result' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============ App Meta Operations ============

export async function getAppMeta(key: string): Promise<string | null> {
  await initializeSchema();
  const database = getDatabase();
  const result = await database.execute({
    sql: 'SELECT value FROM app_meta WHERE key = ?',
    args: [key]
  });
  if (result.rows.length > 0) {
    return result.rows[0].value as string | null;
  }
  return null;
}

export async function setAppMeta(key: string, value: string | null): Promise<void> {
  await initializeSchema();
  const database = getDatabase();
  await database.execute({
    sql: 'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    args: [key, value]
  });
}

// ============ Book Operations ============

export async function getBookCount(): Promise<number> {
  await initializeSchema();
  const database = getDatabase();
  const result = await database.execute('SELECT COUNT(*) as count FROM books');
  if (result.rows.length > 0) {
    return result.rows[0].count as number;
  }
  return 0;
}

// Get all books for grid display with optional search
export async function getBooks(search?: string): Promise<BookSummary[]> {
  await initializeSchema();
  const database = getDatabase();

  let sql = `
    SELECT id, title, author, series, series_book_number, duration_seconds, is_duplicate
    FROM books
  `;
  const args: (string | number)[] = [];

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    sql += `
      WHERE title LIKE ? COLLATE NOCASE
         OR author LIKE ? COLLATE NOCASE
         OR series LIKE ? COLLATE NOCASE
         OR narrator LIKE ? COLLATE NOCASE
    `;
    args.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  sql += ' ORDER BY title COLLATE NOCASE ASC';

  const result = await database.execute({ sql, args });

  return result.rows.map((row) => ({
    id: row.id as number,
    title: row.title as string,
    author: row.author as string | null,
    series: row.series as string | null,
    series_book_number: row.series_book_number as string | null,
    duration_seconds: row.duration_seconds as number | null,
    is_duplicate: row.is_duplicate === 1,
  }));
}

// Get single book by ID
export async function getBookById(id: number): Promise<Book | null> {
  await initializeSchema();
  const database = getDatabase();

  const result = await database.execute({
    sql: 'SELECT * FROM books WHERE id = ?',
    args: [id]
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id as number,
    path: row.path as string,
    type: (row.type as string) || 'Folder' as 'Folder' | 'SingleFile',
    title: row.title as string,
    author: row.author as string | null,
    narrator: row.narrator as string | null,
    duration_seconds: row.duration_seconds as number | null,
    has_embedded_cover: row.has_embedded_cover === 1,
    total_size_bytes: row.total_size_bytes as number | null,
    file_count: row.file_count as number | null,
    is_duplicate: row.is_duplicate === 1,
    series: row.series as string | null,
    series_book_number: row.series_book_number as string | null,
    series_ended: row.series_ended === 1 ? true : row.series_ended === 0 ? false : null,
    series_name_raw: row.series_name_raw as string | null,
    series_exact_name_raw: row.series_exact_name_raw as string | null,
    source: (row.source as string) || 'csv',
    date_added: (row.date_added as string) || new Date().toISOString(),
    date_updated: (row.date_updated as string) || new Date().toISOString(),
  };
}

// Upsert books from CSV import
export async function upsertBooks(books: ParsedBook[]): Promise<ImportSummary> {
  await initializeSchema();
  const database = getDatabase();

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      // Check if book exists
      const existing = await database.execute({
        sql: 'SELECT id FROM books WHERE path = ?',
        args: [book.path]
      });

      const now = new Date().toISOString();

      if (existing.rows.length > 0) {
        // Update existing book
        await database.execute({
          sql: `
            UPDATE books SET
              type = ?,
              title = ?,
              author = ?,
              narrator = ?,
              duration_seconds = ?,
              has_embedded_cover = ?,
              total_size_bytes = ?,
              file_count = ?,
              is_duplicate = ?,
              series = ?,
              series_book_number = ?,
              series_ended = ?,
              series_name_raw = ?,
              series_exact_name_raw = ?,
              source = 'csv',
              date_updated = ?
            WHERE path = ?
          `,
          args: [
            book.type,
            book.title,
            book.author,
            book.narrator,
            book.duration_seconds,
            book.has_embedded_cover === null ? null : book.has_embedded_cover ? 1 : 0,
            book.total_size_bytes,
            book.file_count,
            book.is_duplicate === null ? null : book.is_duplicate ? 1 : 0,
            book.series,
            book.series_book_number,
            book.series_ended === null ? null : book.series_ended ? 1 : 0,
            book.series_name_raw,
            book.series_exact_name_raw,
            now,
            book.path
          ]
        });
        updated++;
      } else {
        // Insert new book
        await database.execute({
          sql: `
            INSERT INTO books (
              path, type, title, author, narrator, duration_seconds,
              has_embedded_cover, total_size_bytes, file_count, is_duplicate,
              series, series_book_number, series_ended,
              series_name_raw, series_exact_name_raw,
              source, date_added, date_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv', ?, ?)
          `,
          args: [
            book.path,
            book.type,
            book.title,
            book.author,
            book.narrator,
            book.duration_seconds,
            book.has_embedded_cover === null ? null : book.has_embedded_cover ? 1 : 0,
            book.total_size_bytes,
            book.file_count,
            book.is_duplicate === null ? null : book.is_duplicate ? 1 : 0,
            book.series,
            book.series_book_number,
            book.series_ended === null ? null : book.series_ended ? 1 : 0,
            book.series_name_raw,
            book.series_exact_name_raw,
            now,
            now
          ]
        });
        inserted++;
      }
    } catch (error) {
      console.error(`[DB] Error upserting book: ${book.path}`, error);
      errors++;
    }
  }

  return {
    totalRows: books.length,
    inserted,
    updated,
    skipped: 0, // Skipping handled in CSV parser
    errors
  };
}

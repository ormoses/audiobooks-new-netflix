#!/usr/bin/env npx tsx

/**
 * Local CSV Import Script for Turso Cloud Database
 *
 * This script imports audiobook data from a local CSV file directly into the
 * Turso cloud database. It uses the same merge logic as the web app:
 * - Match by path
 * - Preserve user fields: status, book_rating, tags, notes, cover_image_path
 * - Preserve narrator_ratings table (do not delete/overwrite)
 * - Update metadata fields from CSV
 * - Mark books as missing_from_csv=1 if present in DB but not in CSV
 *
 * Usage:
 *   npm run import:cloud -- --csv "C:\path\to\audiobook_index_series_verified.csv"
 *
 * Required environment variables in .env.local:
 *   TURSO_DATABASE_URL=libsql://your-db.turso.io
 *   TURSO_AUTH_TOKEN=your-turso-token
 */

import { createClient, Client } from '@libsql/client';
import Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ============ Types ============

interface CsvRow {
  Path?: string;
  Type?: string;
  Title?: string;
  Author?: string;
  Duration_Seconds?: string;
  Has_Embedded_Cover?: string;
  Total_Size_Bytes?: string;
  File_Count?: string;
  Is_Duplicate?: string;
  Series_Name?: string;
  Series_Exact_Name?: string;
  Book_Number?: string;
  Series_Ended?: string;
  Narrator?: string;
}

interface ParsedBook {
  path: string;
  type: 'Folder' | 'SingleFile';
  title: string;
  author: string | null;
  narrator: string | null;
  duration_seconds: number | null;
  has_embedded_cover: boolean | null;
  total_size_bytes: number | null;
  file_count: number | null;
  is_duplicate: boolean | null;
  series: string | null;
  series_book_number: string | null;
  series_ended: boolean | null;
  series_name_raw: string | null;
  series_exact_name_raw: string | null;
}

interface ImportSummary {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  markedMissing: number;
}

// ============ Utility Functions ============

function normalizePath(p: string): string {
  if (!p) return '';
  return p
    .trim()
    .replace(/\//g, '\\')
    .replace(/\\+/g, '\\')
    .replace(/\\$/, '')
    .replace(/^([A-Za-z]:)$/, '$1\\');
}

function parseCsvBoolean(value: string | undefined): boolean | null {
  if (!value || value.trim() === '') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'TRUE' || normalized === '1' || normalized === 'YES') return true;
  if (normalized === 'FALSE' || normalized === '0' || normalized === 'NO') return false;
  return null;
}

function parseCsvInt(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

function parseCsvString(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

// ============ Database Schema ============

const createTablesSQL = [
  `CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'Folder',
    title TEXT NOT NULL,
    author TEXT,
    narrator TEXT,
    duration_seconds INTEGER,
    has_embedded_cover INTEGER DEFAULT 0,
    total_size_bytes INTEGER,
    file_count INTEGER,
    is_duplicate INTEGER DEFAULT 0,
    series TEXT,
    series_book_number TEXT,
    series_ended INTEGER,
    series_name_raw TEXT,
    series_exact_name_raw TEXT,
    source TEXT DEFAULT 'csv',
    status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'finished')),
    book_rating INTEGER CHECK(book_rating IS NULL OR (book_rating >= 1 AND book_rating <= 5)),
    tags TEXT,
    notes TEXT,
    cover_image_path TEXT,
    date_added TEXT,
    date_updated TEXT,
    missing_from_csv INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS narrator_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    narrator_name TEXT NOT NULL,
    rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
    created_at TEXT,
    updated_at TEXT,
    UNIQUE(book_id, narrator_name),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  )`,
];

const createIndexesSQL = [
  'CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)',
  'CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)',
  'CREATE INDEX IF NOT EXISTS idx_books_series ON books(series)',
  'CREATE INDEX IF NOT EXISTS idx_books_narrator ON books(narrator)',
  'CREATE INDEX IF NOT EXISTS idx_books_is_duplicate ON books(is_duplicate)',
  'CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)',
  'CREATE INDEX IF NOT EXISTS idx_books_book_rating ON books(book_rating)',
  'CREATE INDEX IF NOT EXISTS idx_narrator_ratings_book_id ON narrator_ratings(book_id)',
];

// ============ CSV Parsing ============

function parseCsvFile(filePath: string): Promise<{ success: boolean; books: ParsedBook[]; totalRows: number; skippedRows: number; error?: string }> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve({ success: false, books: [], totalRows: 0, skippedRows: 0, error: `File not found: ${filePath}` });
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const books: ParsedBook[] = [];
    let totalRows = 0;
    let skippedRows = 0;

    Papa.parse<CsvRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        // Validate required columns
        const fields = results.meta.fields || [];
        const requiredColumns = ['Path', 'Type', 'Title'];
        const missingColumns = requiredColumns.filter(col => !fields.includes(col));

        if (missingColumns.length > 0) {
          resolve({
            success: false,
            books: [],
            totalRows: 0,
            skippedRows: 0,
            error: `Missing required columns: ${missingColumns.join(', ')}`,
          });
          return;
        }

        for (const row of results.data) {
          totalRows++;

          if (!row.Path || !row.Type || !row.Title) {
            skippedRows++;
            continue;
          }

          const type = row.Type.trim();
          if (type !== 'Folder' && type !== 'SingleFile') {
            skippedRows++;
            continue;
          }

          const bookPath = normalizePath(row.Path);
          if (!bookPath) {
            skippedRows++;
            continue;
          }

          const seriesExactName = parseCsvString(row.Series_Exact_Name);
          const seriesName = parseCsvString(row.Series_Name);
          const series = seriesExactName || seriesName;

          books.push({
            path: bookPath,
            type: type as 'Folder' | 'SingleFile',
            title: row.Title.trim(),
            author: parseCsvString(row.Author),
            narrator: parseCsvString(row.Narrator),
            duration_seconds: parseCsvInt(row.Duration_Seconds),
            has_embedded_cover: parseCsvBoolean(row.Has_Embedded_Cover),
            total_size_bytes: parseCsvInt(row.Total_Size_Bytes),
            file_count: parseCsvInt(row.File_Count),
            is_duplicate: parseCsvBoolean(row.Is_Duplicate),
            series,
            series_book_number: parseCsvString(row.Book_Number),
            series_ended: parseCsvBoolean(row.Series_Ended),
            series_name_raw: seriesName,
            series_exact_name_raw: seriesExactName,
          });
        }

        resolve({ success: true, books, totalRows, skippedRows });
      },
      error: (error: Error) => {
        resolve({
          success: false,
          books: [],
          totalRows: 0,
          skippedRows: 0,
          error: `CSV parse error: ${error.message}`,
        });
      },
    });
  });
}

// ============ Database Operations ============

async function initializeSchema(client: Client): Promise<void> {
  console.log('[DB] Initializing schema...');

  // Enable foreign keys
  await client.execute('PRAGMA foreign_keys = ON');

  // Create tables
  for (const sql of createTablesSQL) {
    await client.execute(sql);
  }

  // Create indexes
  for (const sql of createIndexesSQL) {
    try {
      await client.execute(sql);
    } catch {
      // Index might already exist
    }
  }

  console.log('[DB] Schema initialized');
}

async function getAllBookPaths(client: Client): Promise<Set<string>> {
  const result = await client.execute('SELECT path FROM books');
  return new Set(result.rows.map(row => row.path as string));
}

async function upsertBooks(client: Client, books: ParsedBook[]): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      // Check if book exists
      const existing = await client.execute({
        sql: 'SELECT id, source FROM books WHERE path = ?',
        args: [book.path],
      });

      const now = new Date().toISOString();

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const existingSource = row.source as string;
        const isManual = existingSource === 'manual';

        if (isManual) {
          // Selective update for manual books - only update empty fields
          await client.execute({
            sql: `
              UPDATE books SET
                type = COALESCE(type, ?),
                title = CASE WHEN title IS NULL OR title = '' THEN ? ELSE title END,
                author = CASE WHEN author IS NULL OR author = '' THEN ? ELSE author END,
                narrator = CASE WHEN narrator IS NULL OR narrator = '' THEN ? ELSE narrator END,
                duration_seconds = COALESCE(duration_seconds, ?),
                has_embedded_cover = COALESCE(has_embedded_cover, ?),
                total_size_bytes = COALESCE(total_size_bytes, ?),
                file_count = COALESCE(file_count, ?),
                is_duplicate = COALESCE(is_duplicate, ?),
                series = CASE WHEN series IS NULL OR series = '' THEN ? ELSE series END,
                series_book_number = COALESCE(series_book_number, ?),
                series_ended = COALESCE(series_ended, ?),
                series_name_raw = COALESCE(series_name_raw, ?),
                series_exact_name_raw = COALESCE(series_exact_name_raw, ?),
                missing_from_csv = 0,
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
              book.path,
            ],
          });
        } else {
          // Full update for csv source books
          await client.execute({
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
                missing_from_csv = 0,
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
              book.path,
            ],
          });
        }
        updated++;
      } else {
        // Insert new book
        await client.execute({
          sql: `
            INSERT INTO books (
              path, type, title, author, narrator, duration_seconds,
              has_embedded_cover, total_size_bytes, file_count, is_duplicate,
              series, series_book_number, series_ended,
              series_name_raw, series_exact_name_raw,
              source, missing_from_csv, date_added, date_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv', 0, ?, ?)
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
            now,
          ],
        });
        inserted++;
      }
    } catch (error) {
      console.error(`[Error] Failed to upsert book: ${book.path}`, error);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

async function markMissingBooks(client: Client, missingPaths: Set<string>): Promise<number> {
  if (missingPaths.size === 0) return 0;

  const now = new Date().toISOString();
  let marked = 0;

  const pathsArray = Array.from(missingPaths);
  for (const bookPath of pathsArray) {
    try {
      await client.execute({
        sql: 'UPDATE books SET missing_from_csv = 1, date_updated = ? WHERE path = ?',
        args: [now, bookPath],
      });
      marked++;
    } catch (error) {
      console.error(`[Error] Failed to mark missing: ${bookPath}`, error);
    }
  }

  return marked;
}

async function setAppMeta(client: Client, key: string, value: string): Promise<void> {
  await client.execute({
    sql: 'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    args: [key, value],
  });
}

// ============ Main ============

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     AudioBooks Catalog - Turso Import Script               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let csvPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && args[i + 1]) {
      csvPath = args[i + 1];
      break;
    }
    if (args[i].startsWith('--csv=')) {
      csvPath = args[i].substring(6);
      break;
    }
  }

  if (!csvPath) {
    console.error('Usage: npm run import:cloud -- --csv "C:\\path\\to\\file.csv"');
    console.error('');
    console.error('Example:');
    console.error('  npm run import:cloud -- --csv "C:\\Users\\ormos\\audiobook_index_series_verified.csv"');
    process.exit(1);
  }

  // Check environment variables
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error('Missing Turso configuration in .env.local:');
    console.error('  TURSO_DATABASE_URL=libsql://your-db.turso.io');
    console.error('  TURSO_AUTH_TOKEN=your-turso-token');
    process.exit(1);
  }

  console.log(`[Config] CSV Path: ${csvPath}`);
  console.log(`[Config] Turso URL: ${tursoUrl}`);
  console.log('');

  // Connect to Turso
  console.log('[DB] Connecting to Turso...');
  const client = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  try {
    // Initialize schema
    await initializeSchema(client);

    // Get existing paths before import
    console.log('[DB] Getting existing book paths...');
    const existingPaths = await getAllBookPaths(client);
    console.log(`[DB] Found ${existingPaths.size} existing books`);

    // Parse CSV
    console.log(`[CSV] Parsing ${csvPath}...`);
    const parseResult = await parseCsvFile(csvPath);

    if (!parseResult.success) {
      console.error(`[CSV] Parse error: ${parseResult.error}`);
      process.exit(1);
    }

    console.log(`[CSV] Parsed ${parseResult.totalRows} rows, ${parseResult.books.length} valid, ${parseResult.skippedRows} skipped`);

    // Collect paths from CSV
    const csvPaths = new Set(parseResult.books.map(b => b.path));

    // Upsert books
    console.log('[DB] Upserting books...');
    const upsertResult = await upsertBooks(client, parseResult.books);

    // Find missing books (in DB but not in CSV)
    const missingPaths = new Set<string>();
    const existingPathsArray = Array.from(existingPaths);
    for (const existingPath of existingPathsArray) {
      if (!csvPaths.has(existingPath)) {
        missingPaths.add(existingPath);
      }
    }

    // Mark missing books
    console.log(`[DB] Marking ${missingPaths.size} books as missing from CSV...`);
    const markedMissing = await markMissingBooks(client, missingPaths);

    // Update app metadata
    await setAppMeta(client, 'last_csv_path', csvPath);
    await setAppMeta(client, 'last_import_at', new Date().toISOString());

    // Print summary
    const summary: ImportSummary = {
      totalRows: parseResult.totalRows,
      inserted: upsertResult.inserted,
      updated: upsertResult.updated,
      skipped: parseResult.skippedRows,
      errors: upsertResult.errors,
      markedMissing,
    };

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    IMPORT SUMMARY                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total CSV Rows:      ${String(summary.totalRows).padStart(6)}                            ║`);
    console.log(`║  Books Inserted:      ${String(summary.inserted).padStart(6)}                            ║`);
    console.log(`║  Books Updated:       ${String(summary.updated).padStart(6)}                            ║`);
    console.log(`║  Rows Skipped:        ${String(summary.skipped).padStart(6)}                            ║`);
    console.log(`║  Errors:              ${String(summary.errors).padStart(6)}                            ║`);
    console.log(`║  Marked Missing:      ${String(summary.markedMissing).padStart(6)}                            ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Import completed successfully!');

    // Get final book count
    const countResult = await client.execute('SELECT COUNT(*) as count FROM books');
    const totalBooks = countResult.rows[0].count as number;
    console.log(`Total books in database: ${totalBooks}`);

  } catch (error) {
    console.error('[Error] Import failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();

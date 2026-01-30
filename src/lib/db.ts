// Database module - SERVER ONLY
// Do not import this file in client components

import 'server-only';
import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { createTablesSQL, initializeMetaSQL, migrationColumns, createIndexesSQL, createOtherIndexesSQL, narratorRatingsMigrationColumns } from './schema';
import {
  Book,
  BookSummary,
  BookSummaryWithNarrators,
  BookWithRatings,
  NeedsRatingBook,
  ImportSummary,
  BookStatus,
  NarratorRating,
  BookFilters,
  BookSort,
  BookSortField,
  SeriesStats,
  SeriesFilters,
  SeriesSort,
  SeriesCompletionStatus,
} from './types';
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

  // Step 5: Migrate narrator_ratings table if needed
  const narratorRatingsColumns = await getTableColumns(database, 'narrator_ratings');
  for (const migration of narratorRatingsMigrationColumns) {
    if (!narratorRatingsColumns.has(migration.column)) {
      try {
        await database.execute(
          `ALTER TABLE narrator_ratings ADD COLUMN ${migration.column} ${migration.definition}`
        );
        console.log(`[DB] Added column: narrator_ratings.${migration.column}`);
      } catch (error) {
        console.log(`[DB] Could not add column narrator_ratings.${migration.column}:`, error);
      }
    }
  }

  // Step 6: Create indexes for other tables (narrator_ratings)
  for (const indexSql of createOtherIndexesSQL) {
    try {
      await database.execute(indexSql);
    } catch (error) {
      // Index might already exist, ignore
    }
  }

  // Step 7: Initialize meta data
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
    SELECT id, title, author, series, series_book_number, duration_seconds, is_duplicate,
           status, book_rating, cover_image_path, missing_from_csv
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
    status: (row.status as BookStatus) || 'not_started',
    book_rating: row.book_rating as number | null,
    cover_image_path: row.cover_image_path as string | null,
    missing_from_csv: row.missing_from_csv === 1,
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
    type: ((row.type as string) || 'Folder') as 'Folder' | 'SingleFile',
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
    status: (row.status as BookStatus) || 'not_started',
    book_rating: row.book_rating as number | null,
    tags: row.tags as string | null,
    notes: row.notes as string | null,
    cover_image_path: row.cover_image_path as string | null,
    missing_from_csv: row.missing_from_csv === 1,
    date_added: (row.date_added as string) || new Date().toISOString(),
    date_updated: (row.date_updated as string) || new Date().toISOString(),
  };
}

// Get all book paths for missing detection
export async function getAllBookPaths(): Promise<Set<string>> {
  await initializeSchema();
  const database = getDatabase();
  const result = await database.execute('SELECT path FROM books');
  return new Set(result.rows.map(row => row.path as string));
}

// Mark books as missing from CSV
export async function markMissingBooks(missingPaths: Set<string>): Promise<number> {
  if (missingPaths.size === 0) return 0;

  await initializeSchema();
  const database = getDatabase();
  const now = new Date().toISOString();

  let marked = 0;
  const pathsArray = Array.from(missingPaths);
  for (const path of pathsArray) {
    try {
      await database.execute({
        sql: 'UPDATE books SET missing_from_csv = 1, date_updated = ? WHERE path = ?',
        args: [now, path]
      });
      marked++;
    } catch (error) {
      console.error(`[DB] Error marking book missing: ${path}`, error);
    }
  }
  return marked;
}

// Clear missing_from_csv flag for books that are in CSV
export async function clearMissingFlag(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  await initializeSchema();
  const database = getDatabase();
  const now = new Date().toISOString();

  for (const path of paths) {
    await database.execute({
      sql: 'UPDATE books SET missing_from_csv = 0, date_updated = ? WHERE path = ? AND missing_from_csv = 1',
      args: [now, path]
    });
  }
}

// Upsert books from CSV import with merge logic
export async function upsertBooks(books: ParsedBook[]): Promise<Omit<ImportSummary, 'markedMissing'>> {
  await initializeSchema();
  const database = getDatabase();

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const book of books) {
    try {
      // Check if book exists and get its current source
      const existing = await database.execute({
        sql: 'SELECT id, source, title, author, narrator FROM books WHERE path = ?',
        args: [book.path]
      });

      const now = new Date().toISOString();

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const existingSource = row.source as string;
        const isManual = existingSource === 'manual';

        // For manual source books: only update metadata if existing field is empty
        // For csv source books: always update metadata
        // Never change source if it's 'manual'
        // Always clear missing_from_csv flag
        if (isManual) {
          // Selective update for manual books - only update empty fields
          await database.execute({
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
              book.path
            ]
          });
        } else {
          // Full update for csv source books
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
              book.path
            ]
          });
        }
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

// ============ Book Update Operations ============

// Update book status and/or rating
export async function updateBook(
  id: number,
  updates: {
    status?: BookStatus;
    book_rating?: number | null;
    tags?: string | null;
    notes?: string | null;
  }
): Promise<Book | null> {
  await initializeSchema();
  const database = getDatabase();

  // Build dynamic update query
  const setClauses: string[] = [];
  const args: (string | number | null)[] = [];

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    args.push(updates.status);
  }
  if (updates.book_rating !== undefined) {
    setClauses.push('book_rating = ?');
    args.push(updates.book_rating);
  }
  if (updates.tags !== undefined) {
    setClauses.push('tags = ?');
    args.push(updates.tags);
  }
  if (updates.notes !== undefined) {
    setClauses.push('notes = ?');
    args.push(updates.notes);
  }

  if (setClauses.length === 0) {
    return getBookById(id);
  }

  // Always update date_updated
  setClauses.push('date_updated = ?');
  args.push(new Date().toISOString());

  // Add id for WHERE clause
  args.push(id);

  await database.execute({
    sql: `UPDATE books SET ${setClauses.join(', ')} WHERE id = ?`,
    args
  });

  return getBookById(id);
}

// ============ Narrator Rating Operations ============

// Parse narrator string into array (handles comma-separated narrators)
export function parseNarrators(narratorString: string | null): string[] {
  if (!narratorString) return [];
  return narratorString
    .split(',')
    .map(n => n.trim())
    .filter(n => n.length > 0);
}

// Get narrator ratings for a specific book
export async function getNarratorRatings(bookId: number): Promise<Record<string, number | null>> {
  await initializeSchema();
  const database = getDatabase();

  const result = await database.execute({
    sql: 'SELECT narrator_name, rating FROM narrator_ratings WHERE book_id = ?',
    args: [bookId]
  });

  const ratings: Record<string, number | null> = {};
  for (const row of result.rows) {
    ratings[row.narrator_name as string] = row.rating as number | null;
  }
  return ratings;
}

// Upsert narrator ratings for a book
export async function upsertNarratorRatings(
  bookId: number,
  ratings: NarratorRating[]
): Promise<void> {
  await initializeSchema();
  const database = getDatabase();

  const now = new Date().toISOString();

  for (const rating of ratings) {
    await database.execute({
      sql: `
        INSERT INTO narrator_ratings (book_id, narrator_name, rating, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(book_id, narrator_name) DO UPDATE SET
          rating = excluded.rating,
          updated_at = excluded.updated_at
      `,
      args: [bookId, rating.narratorName, rating.rating, now, now]
    });
  }
}

// Get book with all ratings (for detail page)
export async function getBookWithRatings(id: number): Promise<BookWithRatings | null> {
  const book = await getBookById(id);
  if (!book) return null;

  const narrators = parseNarrators(book.narrator);
  const narratorRatings = await getNarratorRatings(id);

  return {
    ...book,
    narrators,
    narratorRatings
  };
}

// ============ Needs Rating Operations ============

// Get books that need rating (Finished status but missing book_rating or narrator ratings)
export async function getNeedsRatingBooks(): Promise<NeedsRatingBook[]> {
  await initializeSchema();
  const database = getDatabase();

  // Get all finished books
  const result = await database.execute(`
    SELECT id, title, author, series, series_book_number, duration_seconds, narrator, book_rating
    FROM books
    WHERE status = 'finished'
    ORDER BY date_updated DESC
  `);

  const books: NeedsRatingBook[] = [];

  for (const row of result.rows) {
    const bookId = row.id as number;
    const narrator = row.narrator as string | null;
    const bookRating = row.book_rating as number | null;
    const narrators = parseNarrators(narrator);
    const narratorRatings = await getNarratorRatings(bookId);

    // Check if book needs rating:
    // 1. Missing book rating, OR
    // 2. Has narrators but at least one is missing rating
    const missingBookRating = bookRating === null;
    const missingNarratorRating = narrators.some(n => narratorRatings[n] === undefined || narratorRatings[n] === null);

    if (missingBookRating || missingNarratorRating) {
      books.push({
        id: bookId,
        title: row.title as string,
        author: row.author as string | null,
        series: row.series as string | null,
        series_book_number: row.series_book_number as string | null,
        duration_seconds: row.duration_seconds as number | null,
        narrator,
        book_rating: bookRating,
        narrators,
        narratorRatings
      });
    }
  }

  return books;
}

// ============ Step 4: Series + Filters + Sorting ============

// Whitelist of allowed sort fields
const ALLOWED_BOOK_SORT_FIELDS = new Set<BookSortField>([
  'title',
  'author',
  'narrator',
  'book_rating',
  'date_added',
  'status',
  'series',
  'series_book_number',
]);

// Check if a book is fully rated
export function isBookFullyRated(
  bookRating: number | null,
  narrators: string[],
  narratorRatings: Record<string, number | null>
): boolean {
  if (bookRating === null) return false;
  if (narrators.length === 0) return true;
  return narrators.every(n => narratorRatings[n] != null);
}

// Get all books with narrator ratings in a single efficient query
export async function getAllBooksWithNarrators(): Promise<BookSummaryWithNarrators[]> {
  await initializeSchema();
  const database = getDatabase();

  // Get all books
  const booksResult = await database.execute(`
    SELECT id, title, author, series, series_book_number, duration_seconds,
           is_duplicate, status, book_rating, narrator, date_added, date_updated,
           cover_image_path, missing_from_csv
    FROM books
    ORDER BY id
  `);

  // Get all narrator ratings
  const ratingsResult = await database.execute(`
    SELECT book_id, narrator_name, rating
    FROM narrator_ratings
  `);

  // Build ratings map: bookId -> { narratorName -> rating }
  const ratingsMap = new Map<number, Record<string, number | null>>();
  for (const row of ratingsResult.rows) {
    const bookId = row.book_id as number;
    if (!ratingsMap.has(bookId)) {
      ratingsMap.set(bookId, {});
    }
    ratingsMap.get(bookId)![row.narrator_name as string] = row.rating as number | null;
  }

  // Build books with narrator info
  return booksResult.rows.map((row) => {
    const bookId = row.id as number;
    const narrator = row.narrator as string | null;
    const narrators = parseNarrators(narrator);
    const narratorRatings = ratingsMap.get(bookId) || {};

    return {
      id: bookId,
      title: row.title as string,
      author: row.author as string | null,
      series: row.series as string | null,
      series_book_number: row.series_book_number as string | null,
      duration_seconds: row.duration_seconds as number | null,
      is_duplicate: row.is_duplicate === 1,
      status: (row.status as BookStatus) || 'not_started',
      book_rating: row.book_rating as number | null,
      cover_image_path: row.cover_image_path as string | null,
      missing_from_csv: row.missing_from_csv === 1,
      narrator,
      narrators,
      narratorRatings,
      date_added: (row.date_added as string) || new Date().toISOString(),
      date_updated: (row.date_updated as string) || new Date().toISOString(),
    };
  });
}

// Helper: check if a book matches search query
function bookMatchesSearch(book: BookSummaryWithNarrators, searchLower: string): boolean {
  if (book.title.toLowerCase().includes(searchLower)) return true;
  if (book.author && book.author.toLowerCase().includes(searchLower)) return true;
  if (book.narrator && book.narrator.toLowerCase().includes(searchLower)) return true;
  return false;
}

// Get series stats (single query approach - no N+1)
export async function getSeriesStats(
  filters?: SeriesFilters,
  sort?: SeriesSort
): Promise<SeriesStats[]> {
  const allBooks = await getAllBooksWithNarrators();
  const searchLower = filters?.search?.trim().toLowerCase();

  // Helper: safely get trimmed string
  const safeString = (value: unknown): string => {
    if (value == null) return '';
    return String(value).trim();
  };

  // Group books by series
  const seriesMap = new Map<string, BookSummaryWithNarrators[]>();
  const standaloneBooks: BookSummaryWithNarrators[] = [];

  for (const book of allBooks) {
    const seriesStr = safeString(book.series);
    if (seriesStr) {
      const key = seriesStr;
      if (!seriesMap.has(key)) {
        seriesMap.set(key, []);
      }
      seriesMap.get(key)!.push(book);
    } else {
      standaloneBooks.push(book);
    }
  }

  // Helper: parse series_book_number for numeric sorting (defensive)
  const parseBookNumber = (value: string | number | null | undefined): number => {
    if (value == null) return Infinity;
    const str = String(value).trim();
    if (!str) return Infinity;
    const num = parseFloat(str);
    return isNaN(num) ? Infinity : num;
  };

  // Helper: find cover book for a series (with defensive try/catch)
  // Rule: 1) First book (lowest series_book_number, fallback to earliest date_added)
  //       2) If no cover, fallback to earliest book with cover
  //       3) For standalone: any book with cover (prefer earliest date_added)
  const findCoverBook = (
    books: BookSummaryWithNarrators[],
    isStandalone: boolean
  ): { coverBookId: number | null; coverUpdatedAt: string | null } => {
    try {
      if (books.length === 0) {
        return { coverBookId: null, coverUpdatedAt: null };
      }

      // Sort books: by series_book_number (numeric), then by date_added
      const sortedBooks = [...books].sort((a, b) => {
        if (isStandalone) {
          // For standalone, sort by date_added (earliest first)
          const dateA = a.date_added || '';
          const dateB = b.date_added || '';
          return dateA.localeCompare(dateB);
        }
        // For series, sort by book number, then date_added
        const numA = parseBookNumber(a.series_book_number);
        const numB = parseBookNumber(b.series_book_number);
        if (numA !== numB) return numA - numB;
        const dateA = a.date_added || '';
        const dateB = b.date_added || '';
        return dateA.localeCompare(dateB);
      });

      // Check if first book has cover
      const firstBook = sortedBooks[0];
      if (firstBook.cover_image_path) {
        return { coverBookId: firstBook.id, coverUpdatedAt: firstBook.date_updated || null };
      }

      // Fallback: find earliest book with cover
      const booksWithCover = sortedBooks.filter(b => b.cover_image_path);
      if (booksWithCover.length > 0) {
        const fallback = booksWithCover[0];
        return { coverBookId: fallback.id, coverUpdatedAt: fallback.date_updated || null };
      }

      return { coverBookId: null, coverUpdatedAt: null };
    } catch (error) {
      console.error('[DB] Error in findCoverBook:', error);
      return { coverBookId: null, coverUpdatedAt: null };
    }
  };

  // Compute stats for each series
  const computeStats = (
    seriesKey: string,
    seriesName: string,
    books: BookSummaryWithNarrators[],
    isStandalone: boolean = false
  ): SeriesStats => {
    const bookCount = books.length;
    const finishedCount = books.filter(b => b.status === 'finished').length;
    const notStartedCount = books.filter(b => b.status === 'not_started').length;
    const inProgressCount = books.filter(b => b.status === 'in_progress').length;
    const ratedBooks = books.filter(b => b.book_rating != null);
    const ratedCount = ratedBooks.length;
    const unratedCount = books.filter(
      b => !isBookFullyRated(b.book_rating, b.narrators, b.narratorRatings)
    ).length;

    const avgBookRating =
      ratedCount > 0
        ? ratedBooks.reduce((sum, b) => sum + (b.book_rating ?? 0), 0) / ratedCount
        : null;

    const completionStatus: SeriesCompletionStatus =
      finishedCount === bookCount
        ? 'finished'
        : notStartedCount === bookCount
        ? 'not_started'
        : 'in_progress';

    const completionPercent = bookCount > 0 ? (finishedCount / bookCount) * 100 : 0;
    const totalDurationSeconds = books.reduce(
      (sum, b) => sum + (b.duration_seconds ?? 0),
      0
    );

    // Find cover book
    const { coverBookId, coverUpdatedAt } = findCoverBook(books, isStandalone);

    return {
      seriesKey,
      seriesName,
      bookCount,
      totalDurationSeconds,
      finishedCount,
      notStartedCount,
      inProgressCount,
      avgBookRating,
      ratedCount,
      unratedCount,
      completionStatus,
      completionPercent,
      coverBookId,
      coverUpdatedAt,
    };
  };

  // Build series stats array
  let seriesStatsList: SeriesStats[] = [];

  seriesMap.forEach((books, seriesName) => {
    // If search is active, check if series matches:
    // - series name contains search term, OR
    // - any book in series matches (title, author, narrator)
    if (searchLower) {
      const seriesNameMatches = seriesName.toLowerCase().includes(searchLower);
      const anyBookMatches = books.some(b => bookMatchesSearch(b, searchLower));
      if (!seriesNameMatches && !anyBookMatches) {
        return; // Skip this series
      }
    }
    const seriesKey = encodeURIComponent(seriesName);
    seriesStatsList.push(computeStats(seriesKey, seriesName, books, false));
  });

  // Add standalone (only if any standalone book matches search, or no search)
  if (standaloneBooks.length > 0) {
    if (searchLower) {
      const matchingStandalone = standaloneBooks.filter(b => bookMatchesSearch(b, searchLower));
      if (matchingStandalone.length > 0) {
        // Show standalone with stats based on ALL standalone books, but indicate there are matches
        seriesStatsList.push(computeStats('standalone', 'Standalone Books', standaloneBooks, true));
      }
    } else {
      seriesStatsList.push(computeStats('standalone', 'Standalone Books', standaloneBooks, true));
    }
  }

  // Apply filters
  if (filters) {
    // Series rating filter based on ratedCount/bookCount
    if (filters.ratingFilter === 'fullyRated') {
      // All books have book_rating
      seriesStatsList = seriesStatsList.filter(s => s.ratedCount === s.bookCount && s.bookCount > 0);
    } else if (filters.ratingFilter === 'partlyRated') {
      // Some books rated but not all
      seriesStatsList = seriesStatsList.filter(s => s.ratedCount > 0 && s.ratedCount < s.bookCount);
    } else if (filters.ratingFilter === 'unrated') {
      // No books rated
      seriesStatsList = seriesStatsList.filter(s => s.ratedCount === 0);
    }

    if (filters.completionStatus) {
      seriesStatsList = seriesStatsList.filter(
        s => s.completionStatus === filters.completionStatus
      );
    }
  }

  // Apply sorting
  const sortField = sort?.field || 'seriesName';
  const sortDir = sort?.direction || 'asc';

  seriesStatsList.sort((a, b) => {
    let aVal: number | string | null;
    let bVal: number | string | null;

    switch (sortField) {
      case 'seriesName':
        aVal = a.seriesName.toLowerCase();
        bVal = b.seriesName.toLowerCase();
        break;
      case 'bookCount':
        aVal = a.bookCount;
        bVal = b.bookCount;
        break;
      case 'totalDurationSeconds':
        aVal = a.totalDurationSeconds;
        bVal = b.totalDurationSeconds;
        break;
      case 'avgBookRating':
        // Nulls last
        aVal = a.avgBookRating;
        bVal = b.avgBookRating;
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        break;
      case 'completionPercent':
        aVal = a.completionPercent;
        bVal = b.completionPercent;
        break;
      default:
        aVal = a.seriesName.toLowerCase();
        bVal = b.seriesName.toLowerCase();
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  return seriesStatsList;
}

// Get filtered and sorted books
export async function getBooksFiltered(
  filters?: BookFilters,
  sort?: BookSort
): Promise<BookSummaryWithNarrators[]> {
  let books = await getAllBooksWithNarrators();

  // Apply search filter
  if (filters?.search && filters.search.trim()) {
    const searchLower = filters.search.trim().toLowerCase();
    books = books.filter(
      b =>
        b.title.toLowerCase().includes(searchLower) ||
        (b.author && b.author.toLowerCase().includes(searchLower)) ||
        (b.series && b.series.toLowerCase().includes(searchLower)) ||
        (b.narrator && b.narrator.toLowerCase().includes(searchLower))
    );
  }

  // Apply status filter (OR logic)
  if (filters?.statuses && filters.statuses.length > 0) {
    const statusSet = new Set(filters.statuses);
    books = books.filter(b => statusSet.has(b.status));
  }

  // Apply rating filter
  if (filters?.ratingFilter === 'fullyRated') {
    books = books.filter(b =>
      isBookFullyRated(b.book_rating, b.narrators, b.narratorRatings)
    );
  } else if (filters?.ratingFilter === 'unrated') {
    books = books.filter(
      b => !isBookFullyRated(b.book_rating, b.narrators, b.narratorRatings)
    );
  }

  // Apply series filter
  if (filters?.seriesKey) {
    if (filters.seriesKey === 'standalone') {
      books = books.filter(b => {
        const seriesStr = b.series == null ? '' : String(b.series).trim();
        return !seriesStr;
      });
    } else {
      const seriesName = decodeURIComponent(filters.seriesKey);
      books = books.filter(b => b.series === seriesName);
    }
  }

  // Apply sorting
  const sortField = sort?.field || 'title';
  const sortDir = sort?.direction || 'asc';

  // Validate sort field
  const validField = ALLOWED_BOOK_SORT_FIELDS.has(sortField) ? sortField : 'title';

  books.sort((a, b) => {
    let aVal: number | string | null;
    let bVal: number | string | null;

    switch (validField) {
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'author':
        aVal = (a.author || '').toLowerCase();
        bVal = (b.author || '').toLowerCase();
        break;
      case 'narrator':
        // Use first narrator token
        aVal = (a.narrators[0] || '').toLowerCase();
        bVal = (b.narrators[0] || '').toLowerCase();
        break;
      case 'book_rating':
        // Nulls last
        aVal = a.book_rating;
        bVal = b.book_rating;
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        break;
      case 'date_added':
        aVal = a.date_added;
        bVal = b.date_added;
        break;
      case 'status':
        // Order: not_started, in_progress, finished
        const statusOrder = { not_started: 0, in_progress: 1, finished: 2 };
        aVal = statusOrder[a.status];
        bVal = statusOrder[b.status];
        break;
      case 'series':
        aVal = (a.series || '').toLowerCase();
        bVal = (b.series || '').toLowerCase();
        break;
      case 'series_book_number':
        // Numeric-aware sort
        aVal = parseSeriesNumber(a.series_book_number);
        bVal = parseSeriesNumber(b.series_book_number);
        break;
      default:
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  return books;
}

// Parse series number for numeric-aware sorting
function parseSeriesNumber(value: string | null): number {
  if (!value) return Infinity; // Nulls last
  const num = parseFloat(value);
  return isNaN(num) ? Infinity : num;
}

// ============ Step 5: Export + Covers ============

// Book data for export (all fields)
export interface BookExportData {
  id: number;
  path: string;
  type: string;
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
  source: string;
  status: string;
  book_rating: number | null;
  tags: string | null;
  notes: string | null;
  cover_image_path: string | null;
  missing_from_csv: boolean;
  date_added: string;
  date_updated: string;
  narratorRatings: Record<string, number | null>;
}

// Get all books with full data for export
export async function getBooksForExport(): Promise<BookExportData[]> {
  await initializeSchema();
  const database = getDatabase();

  // Get all books
  const booksResult = await database.execute(`
    SELECT * FROM books ORDER BY id
  `);

  // Get all narrator ratings
  const ratingsResult = await database.execute(`
    SELECT book_id, narrator_name, rating FROM narrator_ratings
  `);

  // Build ratings map
  const ratingsMap = new Map<number, Record<string, number | null>>();
  for (const row of ratingsResult.rows) {
    const bookId = row.book_id as number;
    if (!ratingsMap.has(bookId)) {
      ratingsMap.set(bookId, {});
    }
    ratingsMap.get(bookId)![row.narrator_name as string] = row.rating as number | null;
  }

  return booksResult.rows.map((row) => ({
    id: row.id as number,
    path: row.path as string,
    type: (row.type as string) || 'Folder',
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
    status: (row.status as string) || 'not_started',
    book_rating: row.book_rating as number | null,
    tags: row.tags as string | null,
    notes: row.notes as string | null,
    cover_image_path: row.cover_image_path as string | null,
    missing_from_csv: row.missing_from_csv === 1,
    date_added: (row.date_added as string) || '',
    date_updated: (row.date_updated as string) || '',
    narratorRatings: ratingsMap.get(row.id as number) || {},
  }));
}

// Get books for cover extraction
export async function getBooksForCoverExtraction(
  bookIds?: number[],
  overwrite?: boolean
): Promise<Array<{ id: number; path: string; type: string; cover_image_path: string | null }>> {
  await initializeSchema();
  const database = getDatabase();

  let sql = `
    SELECT id, path, type, cover_image_path
    FROM books
    WHERE has_embedded_cover = 1
  `;
  const args: (number | string)[] = [];

  if (!overwrite) {
    sql += ' AND (cover_image_path IS NULL OR cover_image_path = \'\')';
  }

  if (bookIds && bookIds.length > 0) {
    const placeholders = bookIds.map(() => '?').join(',');
    sql += ` AND id IN (${placeholders})`;
    args.push(...bookIds);
  }

  sql += ' ORDER BY id';

  const result = await database.execute({ sql, args });

  return result.rows.map((row) => ({
    id: row.id as number,
    path: row.path as string,
    type: (row.type as string) || 'Folder',
    cover_image_path: row.cover_image_path as string | null,
  }));
}

// Update book cover path
export async function setBookCoverPath(bookId: number, coverPath: string): Promise<void> {
  await initializeSchema();
  const database = getDatabase();
  const now = new Date().toISOString();

  await database.execute({
    sql: 'UPDATE books SET cover_image_path = ?, date_updated = ? WHERE id = ?',
    args: [coverPath, now, bookId]
  });
}

// Get book cover path
export async function getBookCoverPath(bookId: number): Promise<string | null> {
  await initializeSchema();
  const database = getDatabase();

  const result = await database.execute({
    sql: 'SELECT cover_image_path FROM books WHERE id = ?',
    args: [bookId]
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].cover_image_path as string | null;
}

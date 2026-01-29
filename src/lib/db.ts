// Database module - SERVER ONLY
// Do not import this file in client components

import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTablesSQL, initializeMetaSQL } from './schema';

// Database singleton
let db: Database.Database | null = null;

function getDatabasePath(): string {
  // Use environment variable or default path
  const dbPath = process.env.DATABASE_PATH || './data/app.db';
  return path.resolve(process.cwd(), dbPath);
}

function ensureDataDirectory(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  ensureDataDirectory(dbPath);

  // Create or open database
  db = new Database(dbPath);

  // Enable foreign keys and WAL mode for better performance
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Initialize schema
  db.exec(createTablesSQL);
  db.exec(initializeMetaSQL);

  console.log(`[DB] Database initialized at: ${dbPath}`);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}

// Health check function
export function checkDatabaseHealth(): { ok: boolean; error?: string } {
  try {
    const database = getDatabase();
    // Simple query to verify DB is working
    const result = database.prepare('SELECT 1 as test').get() as { test: number };
    if (result?.test === 1) {
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

// Get app metadata value
export function getAppMeta(key: string): string | null {
  const database = getDatabase();
  const row = database.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

// Set app metadata value
export function setAppMeta(key: string, value: string | null): void {
  const database = getDatabase();
  database.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)').run(key, value);
}

// Get book count (useful for empty state checks)
export function getBookCount(): number {
  const database = getDatabase();
  const row = database.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
  return row?.count ?? 0;
}

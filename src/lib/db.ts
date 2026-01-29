// Database module - SERVER ONLY
// Do not import this file in client components

import 'server-only';
import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { allSchemaStatements, initializeMetaSQL } from './schema';

// Database singleton
let db: Client | null = null;
let schemaInitialized = false;

function getDatabasePath(): string {
  // Use environment variable or default path
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

  // Create libsql client with local file
  db = createClient({
    url: `file:${dbPath}`,
  });

  console.log(`[DB] Database initialized at: ${dbPath}`);

  return db;
}

// Initialize schema (call once at startup)
export async function initializeSchema(): Promise<void> {
  if (schemaInitialized) {
    return;
  }

  const database = getDatabase();

  // Enable foreign keys
  await database.execute('PRAGMA foreign_keys = ON');

  // Run all schema creation statements
  for (const statement of allSchemaStatements) {
    await database.execute(statement);
  }

  // Initialize meta data
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
    // Simple query to verify DB is working
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

// Get app metadata value
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

// Set app metadata value
export async function setAppMeta(key: string, value: string | null): Promise<void> {
  await initializeSchema();
  const database = getDatabase();
  await database.execute({
    sql: 'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    args: [key, value]
  });
}

// Get book count (useful for empty state checks)
export async function getBookCount(): Promise<number> {
  await initializeSchema();
  const database = getDatabase();
  const result = await database.execute('SELECT COUNT(*) as count FROM books');
  if (result.rows.length > 0) {
    return result.rows[0].count as number;
  }
  return 0;
}

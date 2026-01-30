import { NextRequest, NextResponse } from 'next/server';
import { parseCsvFile } from '@/lib/csv-parser';
import { upsertBooks, setAppMeta, getAllBookPaths, markMissingBooks } from '@/lib/db';
import { ImportResponse, ImportSummary } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { isLocalImportAllowed } from '@/lib/env';

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse> | Response> {
  // Block CSV import in production
  if (!isLocalImportAllowed()) {
    return NextResponse.json({
      ok: false,
      error: 'CSV import is not available in production. Use the local import script instead.',
    }, { status: 403 });
  }

  // Require authentication for mutations
  const authResult = await requireAuth();
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { path } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'CSV path is required',
      });
    }

    // Get all existing book paths before import
    const existingPaths = await getAllBookPaths();

    // Parse CSV file
    const parseResult = await parseCsvFile(path);

    if (!parseResult.success) {
      return NextResponse.json({
        ok: false,
        error: parseResult.error || 'Failed to parse CSV',
      });
    }

    // Collect paths from CSV
    const csvPaths = new Set(parseResult.books.map(b => b.path));

    // Upsert books into database
    const dbSummary = await upsertBooks(parseResult.books);

    // Find books that exist in DB but not in CSV
    const missingPaths = new Set<string>();
    existingPaths.forEach((existingPath) => {
      if (!csvPaths.has(existingPath)) {
        missingPaths.add(existingPath);
      }
    });

    // Mark missing books
    const markedMissing = await markMissingBooks(missingPaths);

    // Build final summary
    const summary: ImportSummary = {
      totalRows: parseResult.totalRows,
      inserted: dbSummary.inserted,
      updated: dbSummary.updated,
      skipped: parseResult.skippedRows,
      errors: parseResult.parseErrors + dbSummary.errors,
      markedMissing,
    };

    // Store last CSV path and import timestamp
    await setAppMeta('last_csv_path', path.trim());
    await setAppMeta('last_import_at', new Date().toISOString());

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error('[API] CSV import error:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error importing CSV',
    });
  }
}

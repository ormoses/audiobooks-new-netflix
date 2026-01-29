import { NextRequest, NextResponse } from 'next/server';
import { parseCsvFile } from '@/lib/csv-parser';
import { upsertBooks, setAppMeta } from '@/lib/db';
import { ImportResponse, ImportSummary } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  try {
    const body = await request.json();
    const { path } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'CSV path is required',
      });
    }

    // Parse CSV file
    const parseResult = await parseCsvFile(path);

    if (!parseResult.success) {
      return NextResponse.json({
        ok: false,
        error: parseResult.error || 'Failed to parse CSV',
      });
    }

    // Upsert books into database
    const dbSummary = await upsertBooks(parseResult.books);

    // Build final summary
    const summary: ImportSummary = {
      totalRows: parseResult.totalRows,
      inserted: dbSummary.inserted,
      updated: dbSummary.updated,
      skipped: parseResult.skippedRows,
      errors: parseResult.parseErrors + dbSummary.errors,
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

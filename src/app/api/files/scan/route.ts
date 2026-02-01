import { NextRequest, NextResponse } from 'next/server';
import { scanFolder } from '@/lib/file-scanner';
import { FileScanRequest, FileScanResponse } from '@/lib/types';
import { isProduction } from '@/lib/env';
import { initializeSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest
): Promise<NextResponse<FileScanResponse>> {
  // Block in production - this is a local-only feature
  if (isProduction()) {
    return NextResponse.json({
      ok: false,
      error: 'File scanning is only available in local mode',
    }, { status: 403 });
  }

  try {
    const body: FileScanRequest = await request.json();

    // Validate folder path
    if (!body.folderPath || typeof body.folderPath !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'folderPath is required',
      }, { status: 400 });
    }

    const folderPath = body.folderPath.trim();
    if (!folderPath) {
      return NextResponse.json({
        ok: false,
        error: 'folderPath cannot be empty',
      }, { status: 400 });
    }

    // Initialize DB to check for existing books
    await initializeSchema();

    // Scan the folder
    const { candidates, scannedFolders, warnings } = await scanFolder(folderPath, {
      recursive: body.recursive ?? true,
      maxDepth: body.maxDepth ?? 5,
    });

    // Check which candidates already exist in the database
    const { getDatabase } = await import('@/lib/db');
    const db = getDatabase();

    for (const candidate of candidates) {
      const result = await db.execute({
        sql: 'SELECT id FROM books WHERE path = ?',
        args: [candidate.path],
      });
      candidate.existsInDb = result.rows.length > 0;
    }

    return NextResponse.json({
      ok: true,
      candidates,
      scannedFolders,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error('[API] Error scanning files:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error scanning files',
    }, { status: 500 });
  }
}

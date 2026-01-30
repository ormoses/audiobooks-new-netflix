import { NextRequest, NextResponse } from 'next/server';
import { validateCsvPath } from '@/lib/csv-parser';
import { ValidateResponse } from '@/lib/types';
import { isLocalImportAllowed } from '@/lib/env';

export async function POST(request: NextRequest): Promise<NextResponse<ValidateResponse>> {
  // Block in production - CSV import is local-only
  if (!isLocalImportAllowed()) {
    return NextResponse.json({
      ok: false,
      error: 'CSV validation is not available in production',
    }, { status: 403 });
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

    const validation = validateCsvPath(path);

    if (validation.valid) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({
        ok: false,
        error: validation.error,
      });
    }
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error validating CSV',
    });
  }
}

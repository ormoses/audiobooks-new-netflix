import { NextRequest, NextResponse } from 'next/server';
import { batchApplySeriesRatings, getBooksInSeriesWithRatings } from '@/lib/db';
import { SeriesBatchApplyRequest, SeriesBatchApplyResponse } from '@/lib/types';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesKey: string }> }
): Promise<NextResponse<SeriesBatchApplyResponse> | Response> {
  // Require authentication for mutations
  const authResult = await requireAuth();
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { seriesKey } = await params;

    // URL decode the series key safely
    let decodedSeriesKey: string;
    try {
      decodedSeriesKey = decodeURIComponent(seriesKey);
    } catch {
      return NextResponse.json({
        ok: false,
        error: 'Invalid series key',
      }, { status: 400 });
    }

    // For the database functions, we pass the original seriesKey (encoded)
    // as they handle decoding internally

    const body: SeriesBatchApplyRequest = await request.json();

    // Validate applyMode
    if (!body.applyMode || !['missingOnly', 'overwrite'].includes(body.applyMode)) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid applyMode. Must be "missingOnly" or "overwrite"',
      }, { status: 400 });
    }

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['not_started', 'in_progress', 'finished'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({
          ok: false,
          error: 'Invalid status value',
        }, { status: 400 });
      }
    }

    // Validate bookRating if provided
    if (body.bookRating !== undefined && body.bookRating !== null) {
      if (typeof body.bookRating !== 'number' || body.bookRating < 1 || body.bookRating > 5) {
        return NextResponse.json({
          ok: false,
          error: 'Book rating must be between 1 and 5',
        }, { status: 400 });
      }
    }

    // Validate narratorRating if provided
    if (body.narratorRating !== undefined && body.narratorRating !== null) {
      if (typeof body.narratorRating !== 'number' || body.narratorRating < 1 || body.narratorRating > 5) {
        return NextResponse.json({
          ok: false,
          error: 'Narrator rating must be between 1 and 5',
        }, { status: 400 });
      }
    }

    // Check if at least one field to update is provided
    if (body.status === undefined && body.bookRating === undefined && body.narratorRating === undefined) {
      return NextResponse.json({
        ok: false,
        error: 'At least one field (status, bookRating, or narratorRating) must be provided',
      }, { status: 400 });
    }

    // Verify series exists
    const books = await getBooksInSeriesWithRatings(seriesKey);
    if (books.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'Series not found or has no books',
      }, { status: 404 });
    }

    // Apply batch updates
    const result = await batchApplySeriesRatings(seriesKey, {
      status: body.status,
      bookRating: body.bookRating,
      narratorRating: body.narratorRating,
      applyMode: body.applyMode,
    });

    return NextResponse.json({
      ok: true,
      updated: result,
    });
  } catch (error) {
    console.error('[API] Error in batch apply:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { upsertNarratorRatings, getBookById } from '@/lib/db';
import { NarratorRatingsRequest, NarratorRatingsResponse } from '@/lib/types';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<NarratorRatingsResponse> | Response> {
  // Require authentication for mutations
  const authResult = await requireAuth();
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const { id } = await params;
    const bookId = parseInt(id, 10);

    if (isNaN(bookId)) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid book ID',
      });
    }

    // Check if book exists
    const book = await getBookById(bookId);
    if (!book) {
      return NextResponse.json({
        ok: false,
        error: 'Book not found',
      }, { status: 404 });
    }

    const body: NarratorRatingsRequest = await request.json();

    // Validate ratings
    if (!Array.isArray(body.ratings)) {
      return NextResponse.json({
        ok: false,
        error: 'ratings must be an array',
      });
    }

    for (const rating of body.ratings) {
      if (!rating.narratorName || typeof rating.narratorName !== 'string') {
        return NextResponse.json({
          ok: false,
          error: 'Each rating must have a narratorName string',
        });
      }
      if (rating.rating !== null && (rating.rating < 1 || rating.rating > 5)) {
        return NextResponse.json({
          ok: false,
          error: 'Rating must be between 1 and 5 or null',
        });
      }
    }

    await upsertNarratorRatings(bookId, body.ratings);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error('[API] Error updating narrator ratings:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error updating narrator ratings',
    });
  }
}

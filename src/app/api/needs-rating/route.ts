import { NextResponse } from 'next/server';
import { getNeedsRatingBooks, NeedsRatingDebug } from '@/lib/db';
import { NeedsRatingBook } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface NeedsRatingResponseWithDebug {
  ok: boolean;
  books: NeedsRatingBook[];
  debug?: NeedsRatingDebug;
  error?: string;
}

export async function GET(): Promise<NextResponse<NeedsRatingResponseWithDebug>> {
  try {
    const { books, debug } = await getNeedsRatingBooks();

    console.log(`[API] /api/needs-rating returning ${books.length} books, debug: ${JSON.stringify(debug)}`);

    return NextResponse.json({
      ok: true,
      books,
      debug, // Include debug info in response (can remove later)
    });
  } catch (error) {
    console.error('[API] Error fetching needs-rating books:', error);
    return NextResponse.json({
      ok: false,
      books: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching needs-rating books',
    });
  }
}

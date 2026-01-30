import { NextResponse } from 'next/server';
import { getNeedsRatingBooks, NeedsRatingDebug, NeedsRatingBookWithDebug } from '@/lib/db';

// Force fresh data - no caching, no edge runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

interface NeedsRatingResponseWithDebug {
  ok: boolean;
  books: NeedsRatingBookWithDebug[];
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
      debug,
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

import { NextResponse } from 'next/server';
import { getNeedsRatingBooks } from '@/lib/db';
import { NeedsRatingResponse } from '@/lib/types';

export async function GET(): Promise<NextResponse<NeedsRatingResponse>> {
  try {
    const books = await getNeedsRatingBooks();

    return NextResponse.json({
      ok: true,
      books,
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

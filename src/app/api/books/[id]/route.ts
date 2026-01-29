import { NextRequest, NextResponse } from 'next/server';
import { getBookById } from '@/lib/db';
import { BookDetailResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<BookDetailResponse>> {
  try {
    const { id } = await params;
    const bookId = parseInt(id, 10);

    if (isNaN(bookId)) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid book ID',
      });
    }

    const book = await getBookById(bookId);

    if (!book) {
      return NextResponse.json({
        ok: false,
        error: 'Book not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      book,
    });
  } catch (error) {
    console.error('[API] Error fetching book:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching book',
    });
  }
}

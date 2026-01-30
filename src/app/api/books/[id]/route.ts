import { NextRequest, NextResponse } from 'next/server';
import { getBookWithRatings, updateBook } from '@/lib/db';
import { BookDetailResponse, BookUpdateRequest, BookUpdateResponse } from '@/lib/types';
import { requireAuth } from '@/lib/auth';

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

    const book = await getBookWithRatings(bookId);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<BookUpdateResponse> | Response> {
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

    const body: BookUpdateRequest = await request.json();

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['not_started', 'in_progress', 'finished'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({
          ok: false,
          error: 'Invalid status value',
        });
      }
    }

    // Validate book_rating if provided
    if (body.book_rating !== undefined && body.book_rating !== null) {
      if (body.book_rating < 1 || body.book_rating > 5) {
        return NextResponse.json({
          ok: false,
          error: 'Rating must be between 1 and 5',
        });
      }
    }

    const updatedBook = await updateBook(bookId, {
      status: body.status,
      book_rating: body.book_rating,
      tags: body.tags,
      notes: body.notes,
    });

    if (!updatedBook) {
      return NextResponse.json({
        ok: false,
        error: 'Book not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      book: updatedBook,
    });
  } catch (error) {
    console.error('[API] Error updating book:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error updating book',
    });
  }
}

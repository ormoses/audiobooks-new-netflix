import { NextRequest, NextResponse } from 'next/server';
import { getBooksFiltered } from '@/lib/db';
import { BooksWithNarratorsResponse, BookStatus, BookSortField, SortDirection } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<NextResponse<BooksWithNarratorsResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse search
    const search = searchParams.get('search') || undefined;

    // Parse status filter (comma-separated)
    const statusParam = searchParams.get('status');
    const statuses: BookStatus[] | undefined = statusParam
      ? (statusParam.split(',').filter(s =>
          ['not_started', 'in_progress', 'finished'].includes(s)
        ) as BookStatus[])
      : undefined;

    // Parse rating filter
    const ratingParam = searchParams.get('rating');
    const ratingFilter =
      ratingParam === 'fullyRated' || ratingParam === 'unrated'
        ? ratingParam
        : undefined;

    // Parse series key
    const seriesKey = searchParams.get('seriesKey') || undefined;

    // Parse sort (field-direction format, e.g., "title-asc")
    const sortParam = searchParams.get('sort');
    let sort: { field: BookSortField; direction: SortDirection } | undefined;

    if (sortParam) {
      const [field, direction] = sortParam.split('-');
      const validFields: BookSortField[] = [
        'title',
        'author',
        'narrator',
        'book_rating',
        'date_added',
        'status',
        'series',
        'series_book_number',
      ];
      if (
        validFields.includes(field as BookSortField) &&
        (direction === 'asc' || direction === 'desc')
      ) {
        sort = { field: field as BookSortField, direction };
      }
    }

    const books = await getBooksFiltered(
      {
        search,
        statuses: statuses?.length ? statuses : undefined,
        ratingFilter,
        seriesKey,
      },
      sort
    );

    return NextResponse.json({
      ok: true,
      books,
      total: books.length,
    });
  } catch (error) {
    console.error('[API] Error fetching books:', error);
    return NextResponse.json({
      ok: false,
      books: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error fetching books',
    });
  }
}

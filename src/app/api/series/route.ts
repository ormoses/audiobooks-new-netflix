import { NextRequest, NextResponse } from 'next/server';
import { getSeriesStats } from '@/lib/db';
import { SeriesResponse, BookStatus, SeriesSortField, SortDirection, SeriesRatingFilter } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<NextResponse<SeriesResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse search
    const search = searchParams.get('search') || undefined;

    // Parse rating filter
    const ratingParam = searchParams.get('rating');
    const ratingFilter: SeriesRatingFilter | undefined =
      ratingParam === 'fullyRated' || ratingParam === 'partlyRated' || ratingParam === 'unrated'
        ? ratingParam
        : undefined;

    // Parse completion status filter
    const completionParam = searchParams.get('completion');
    const completionStatus: BookStatus | undefined =
      completionParam === 'not_started' ||
      completionParam === 'in_progress' ||
      completionParam === 'finished'
        ? completionParam
        : undefined;

    // Parse sort
    const sortParam = searchParams.get('sort');
    let sort: { field: SeriesSortField; direction: SortDirection } | undefined;

    if (sortParam) {
      const [field, direction] = sortParam.split('-');
      const validFields: SeriesSortField[] = [
        'seriesName',
        'bookCount',
        'totalDurationSeconds',
        'avgBookRating',
        'completionPercent',
      ];
      if (
        validFields.includes(field as SeriesSortField) &&
        (direction === 'asc' || direction === 'desc')
      ) {
        sort = { field: field as SeriesSortField, direction };
      }
    }

    const series = await getSeriesStats(
      {
        search,
        ratingFilter,
        completionStatus,
      },
      sort
    );

    return NextResponse.json({
      ok: true,
      series,
    });
  } catch (error) {
    console.error('[API] Error fetching series:', error);
    return NextResponse.json({
      ok: false,
      series: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching series',
    });
  }
}

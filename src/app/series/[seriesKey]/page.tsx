import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBooksFiltered, getSeriesStats } from '@/lib/db';
import PageHeader from '@/components/PageHeader';
import SeriesDetailClient from '@/components/SeriesDetailClient';
import { formatDuration } from '@/lib/formatters';

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic';

interface SeriesDetailPageProps {
  params: Promise<{ seriesKey: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function SeriesDetailPage({ params, searchParams }: SeriesDetailPageProps) {
  const { seriesKey } = await params;
  const { from } = await searchParams;

  // Get series stats to get display info
  const allSeries = await getSeriesStats();
  const seriesInfo = allSeries.find(s => s.seriesKey === seriesKey);

  if (!seriesInfo) {
    notFound();
  }

  // Get books for this series
  const books = await getBooksFiltered(
    { seriesKey },
    { field: 'series_book_number', direction: 'asc' }
  );

  const isStandalone = seriesKey === 'standalone';

  // Use from param if present, otherwise fallback to series view
  const backHref = from || '/library?view=series';

  return (
    <div>
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-netflix-light-gray hover:text-white mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Library
      </Link>

      {/* Header */}
      <div className="mb-8">
        <PageHeader
          title={seriesInfo.seriesName}
          subtitle={
            isStandalone
              ? 'Books not part of any series'
              : `${seriesInfo.bookCount} books \u2022 ${formatDuration(seriesInfo.totalDurationSeconds)}`
          }
        />

        {/* Series stats */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-netflix-gray rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${seriesInfo.completionPercent}%` }}
              />
            </div>
            <span className="text-netflix-light-gray">
              {seriesInfo.finishedCount} of {seriesInfo.bookCount} finished
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-netflix-light-gray">
              {seriesInfo.avgBookRating !== null
                ? `${seriesInfo.avgBookRating.toFixed(2)} (${seriesInfo.ratedCount} of ${seriesInfo.bookCount} rated)`
                : `\u2014 (0 of ${seriesInfo.bookCount} rated)`}
            </span>
          </div>

          {/* Unrated count */}
          {seriesInfo.unratedCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-medium rounded">
              {seriesInfo.unratedCount} unrated
            </span>
          )}
        </div>
      </div>

      {/* Books grid with filters */}
      <SeriesDetailClient
        seriesKey={seriesKey}
        initialBooks={books}
        seriesName={seriesInfo.seriesName}
        libraryUrl={from}
      />
    </div>
  );
}

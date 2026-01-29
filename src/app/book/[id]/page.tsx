import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBookWithRatings } from '@/lib/db';
import BookDetailWithProgress from '@/components/BookDetailWithProgress';

// Disable caching to ensure fresh data on every request
export const dynamic = 'force-dynamic';

interface BookDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; seriesKey?: string }>;
}

export default async function BookDetailPage({ params, searchParams }: BookDetailPageProps) {
  const { id } = await params;
  const { from, seriesKey } = await searchParams;
  const bookId = parseInt(id, 10);

  if (isNaN(bookId)) {
    notFound();
  }

  const book = await getBookWithRatings(bookId);

  if (!book) {
    notFound();
  }

  // Use from param if present, otherwise fallback to /library
  const backToLibraryHref = from || '/library';

  // Build back to series href if seriesKey is present
  const backToSeriesHref = seriesKey
    ? from
      ? `/series/${seriesKey}?from=${encodeURIComponent(from)}`
      : `/series/${seriesKey}`
    : null;

  return (
    <div className="max-w-4xl">
      {/* Navigation links */}
      <div className="flex items-center gap-4 mb-6">
        {/* Back to Library */}
        <Link
          href={backToLibraryHref}
          className="inline-flex items-center gap-2 text-netflix-light-gray hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>

        {/* Back to Series (only if came from series) */}
        {backToSeriesHref && (
          <>
            <span className="text-netflix-light-gray/50">|</span>
            <Link
              href={backToSeriesHref}
              className="inline-flex items-center gap-2 text-netflix-light-gray hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Back to Series
            </Link>
          </>
        )}
      </div>

      <BookDetailWithProgress initialBook={book} />
    </div>
  );
}

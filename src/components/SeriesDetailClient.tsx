'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookSummaryWithNarrators,
  BookStatus,
  RatingFilter,
} from '@/lib/types';
import BookGrid from './BookGrid';
import FilterPanel from './FilterPanel';
import SortDropdown from './SortDropdown';
import SeriesBatchApply from './SeriesBatchApply';

interface SeriesDetailClientProps {
  seriesKey: string;
  initialBooks: BookSummaryWithNarrators[];
  seriesName: string;
  libraryUrl?: string; // Original library URL for back navigation
}

export default function SeriesDetailClient({
  seriesKey,
  initialBooks,
  seriesName,
  libraryUrl,
}: SeriesDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial state from URL
  const initialStatuses = searchParams.get('status')
    ? (searchParams.get('status')!.split(',') as BookStatus[])
    : [];
  const initialRatingFilter = (searchParams.get('rating') as RatingFilter) || 'all';
  const initialSort = searchParams.get('sort') || 'series_book_number-asc';

  // State
  const [books, setBooks] = useState<BookSummaryWithNarrators[]>(initialBooks);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statuses, setStatuses] = useState<BookStatus[]>(initialStatuses);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(initialRatingFilter);

  // Sort
  const [sort, setSort] = useState(initialSort);

  // Batch apply modal
  const [batchApplyOpen, setBatchApplyOpen] = useState(false);

  // Update URL params
  const updateUrl = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      router.replace(`/series/${seriesKey}?${newParams.toString()}`, { scroll: false });
    },
    [router, searchParams, seriesKey]
  );

  // Fetch books
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('seriesKey', seriesKey);
      if (statuses.length > 0) params.set('status', statuses.join(','));
      if (ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (sort) params.set('sort', sort);

      const response = await fetch(`/api/books?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setBooks(data.books);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, [seriesKey, statuses, ratingFilter, sort]);

  // Fetch data when filters change
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Handle status filter change
  const handleStatusChange = (newStatuses: BookStatus[]) => {
    setStatuses(newStatuses);
    updateUrl({ status: newStatuses.length > 0 ? newStatuses.join(',') : null });
  };

  // Handle rating filter change
  const handleRatingFilterChange = (filter: RatingFilter) => {
    setRatingFilter(filter);
    updateUrl({ rating: filter === 'all' ? null : filter });
  };

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    updateUrl({ sort: newSort === 'series_book_number-asc' ? null : newSort });
  };

  return (
    <div className="space-y-6">
      {/* Filters, Sort, and Batch Apply */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <FilterPanel
            view="books"
            statuses={statuses}
            ratingFilter={ratingFilter}
            onStatusChange={handleStatusChange}
            onRatingFilterChange={handleRatingFilterChange}
          />
          {/* Batch Apply Button */}
          <button
            onClick={() => setBatchApplyOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-netflix-gray hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            Batch Apply
          </button>
        </div>
        <SortDropdown
          view="series-detail"
          value={sort}
          onChange={handleSortChange}
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-netflix-light-gray text-sm">
          {loading ? 'Loading...' : `${books.length} book${books.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Books grid */}
      {loading ? (
        <BookGrid books={[]} loading={true} />
      ) : books.length > 0 ? (
        <BookGrid books={books} seriesKey={seriesKey} libraryUrl={libraryUrl} />
      ) : (
        <div className="text-center py-12">
          <p className="text-netflix-light-gray">No books match your filters.</p>
        </div>
      )}

      {/* Batch Apply Modal */}
      <SeriesBatchApply
        isOpen={batchApplyOpen}
        onClose={() => setBatchApplyOpen(false)}
        seriesKey={seriesKey}
        seriesName={seriesName}
        books={initialBooks}
      />
    </div>
  );
}

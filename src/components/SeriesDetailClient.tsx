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
      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <FilterPanel
          view="books"
          statuses={statuses}
          ratingFilter={ratingFilter}
          onStatusChange={handleStatusChange}
          onRatingFilterChange={handleRatingFilterChange}
        />
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
    </div>
  );
}

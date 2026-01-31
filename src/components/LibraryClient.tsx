'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookSummaryWithNarrators,
  SeriesStats,
  LibraryView,
  BookStatus,
  RatingFilter,
  SeriesRatingFilter,
} from '@/lib/types';
import SearchBar from './SearchBar';
import BookGrid from './BookGrid';
import SeriesGrid from './SeriesGrid';
import ViewToggle from './ViewToggle';
import FilterPanel from './FilterPanel';
import SortDropdown from './SortDropdown';
import MobileFilterBar from './MobileFilterBar';
import Link from 'next/link';

interface LibraryClientProps {
  initialBooks: BookSummaryWithNarrators[];
  initialTotal: number;
}

export default function LibraryClient({ initialBooks, initialTotal }: LibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial state from URL
  const initialView = (searchParams.get('view') as LibraryView) || 'books';
  const initialSearch = searchParams.get('search') || '';
  const initialStatuses = searchParams.get('status')
    ? (searchParams.get('status')!.split(',') as BookStatus[])
    : [];
  const initialBookRatingFilter = (searchParams.get('rating') as RatingFilter) || 'all';
  const initialSeriesRatingFilter = (searchParams.get('rating') as SeriesRatingFilter) || 'all';
  const initialSort = searchParams.get('sort') || 'title-asc';
  const initialCompletion = searchParams.get('completion') as BookStatus | null;

  // State
  const [view, setView] = useState<LibraryView>(initialView);
  const [books, setBooks] = useState<BookSummaryWithNarrators[]>(initialBooks);
  const [series, setSeries] = useState<SeriesStats[]>([]);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Filters
  const [statuses, setStatuses] = useState<BookStatus[]>(initialStatuses);
  const [bookRatingFilter, setBookRatingFilter] = useState<RatingFilter>(initialBookRatingFilter);
  const [seriesRatingFilter, setSeriesRatingFilter] = useState<SeriesRatingFilter>(initialSeriesRatingFilter);
  const [completionStatus, setCompletionStatus] = useState<BookStatus | null>(initialCompletion);

  // Sort
  const [sort, setSort] = useState(initialSort);
  const [seriesSort, setSeriesSort] = useState(
    searchParams.get('seriesSort') || 'seriesName-asc'
  );

  // Build current library URL for back navigation
  const getCurrentLibraryUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (view === 'series') params.set('view', 'series');
    if (searchQuery) params.set('search', searchQuery);
    if (view === 'books') {
      if (statuses.length > 0) params.set('status', statuses.join(','));
      if (bookRatingFilter !== 'all') params.set('rating', bookRatingFilter);
      if (sort !== 'title-asc') params.set('sort', sort);
    } else {
      if (seriesRatingFilter !== 'all') params.set('rating', seriesRatingFilter);
      if (completionStatus) params.set('completion', completionStatus);
      if (seriesSort !== 'seriesName-asc') params.set('seriesSort', seriesSort);
    }
    const queryString = params.toString();
    return queryString ? `/library?${queryString}` : '/library';
  }, [view, searchQuery, statuses, bookRatingFilter, sort, seriesRatingFilter, completionStatus, seriesSort]);

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
      router.replace(`/library?${newParams.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Fetch books
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statuses.length > 0) params.set('status', statuses.join(','));
      if (bookRatingFilter !== 'all') params.set('rating', bookRatingFilter);
      if (sort) params.set('sort', sort);

      const response = await fetch(`/api/books?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setBooks(data.books);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statuses, bookRatingFilter, sort]);

  // Fetch series
  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (seriesRatingFilter !== 'all') params.set('rating', seriesRatingFilter);
      if (completionStatus) params.set('completion', completionStatus);
      if (seriesSort) params.set('sort', seriesSort);

      const response = await fetch(`/api/series?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setSeries(data.series);
      }
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, seriesRatingFilter, completionStatus, seriesSort]);

  // Fetch data when filters change
  useEffect(() => {
    if (view === 'books') {
      fetchBooks();
    } else {
      fetchSeries();
    }
  }, [view, fetchBooks, fetchSeries]);

  // Handle view change
  const handleViewChange = (newView: LibraryView) => {
    setView(newView);
    updateUrl({ view: newView === 'books' ? null : newView });
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateUrl({ search: query || null });
  };

  // Handle status filter change
  const handleStatusChange = (newStatuses: BookStatus[]) => {
    setStatuses(newStatuses);
    updateUrl({ status: newStatuses.length > 0 ? newStatuses.join(',') : null });
  };

  // Handle book rating filter change
  const handleBookRatingFilterChange = (filter: RatingFilter) => {
    setBookRatingFilter(filter);
    updateUrl({ rating: filter === 'all' ? null : filter });
  };

  // Handle series rating filter change
  const handleSeriesRatingFilterChange = (filter: SeriesRatingFilter) => {
    setSeriesRatingFilter(filter);
    updateUrl({ rating: filter === 'all' ? null : filter });
  };

  // Handle completion status change
  const handleCompletionStatusChange = (status: BookStatus | null) => {
    setCompletionStatus(status);
    updateUrl({ completion: status });
  };

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    if (view === 'books') {
      setSort(newSort);
      updateUrl({ sort: newSort === 'title-asc' ? null : newSort });
    } else {
      setSeriesSort(newSort);
      updateUrl({ seriesSort: newSort === 'seriesName-asc' ? null : newSort });
    }
  };

  // Empty state - no books at all
  if (initialTotal === 0 && !searchQuery && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-netflix-gray flex items-center justify-center">
          <svg
            className="w-12 h-12 text-netflix-light-gray"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">No audiobooks yet</h2>
        <p className="text-netflix-light-gray max-w-md mb-6">
          Import your audiobook library to start browsing. Go to Settings to import your CSV
          catalog file.
        </p>
        <Link
          href="/settings"
          className="px-6 py-3 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded-md transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Top bar: View toggle + Search */}
      <div className="sticky top-0 z-20 md:static bg-netflix-black pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 pt-2 md:pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
          <ViewToggle view={view} onChange={handleViewChange} />
          <div className="flex-1 md:max-w-xl">
            <SearchBar
              onSearch={handleSearch}
              initialValue={searchQuery}
              placeholder={
                view === 'books'
                  ? 'Search by title, author, series, or narrator...'
                  : 'Search series by name, book title, author, or narrator...'
              }
            />
          </div>
        </div>
      </div>

      {/* Mobile Filters and Sort */}
      <MobileFilterBar
        view={view}
        statuses={statuses}
        bookRatingFilter={bookRatingFilter}
        onStatusChange={handleStatusChange}
        onBookRatingFilterChange={handleBookRatingFilterChange}
        seriesRatingFilter={seriesRatingFilter}
        completionStatus={completionStatus}
        onSeriesRatingFilterChange={handleSeriesRatingFilterChange}
        onCompletionStatusChange={handleCompletionStatusChange}
        sort={view === 'books' ? sort : seriesSort}
        onSortChange={handleSortChange}
      />

      {/* Desktop Filters and Sort */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {view === 'books' ? (
          <FilterPanel
            view="books"
            statuses={statuses}
            ratingFilter={bookRatingFilter}
            onStatusChange={handleStatusChange}
            onRatingFilterChange={handleBookRatingFilterChange}
          />
        ) : (
          <FilterPanel
            view="series"
            ratingFilter={seriesRatingFilter}
            completionStatus={completionStatus}
            onRatingFilterChange={handleSeriesRatingFilterChange}
            onCompletionStatusChange={handleCompletionStatusChange}
          />
        )}
        <SortDropdown
          view={view}
          value={view === 'books' ? sort : seriesSort}
          onChange={handleSortChange}
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-netflix-light-gray text-sm">
          {loading ? (
            'Loading...'
          ) : view === 'books' ? (
            searchQuery ? (
              `${books.length} result${books.length !== 1 ? 's' : ''} for "${searchQuery}"`
            ) : (
              `${total} audiobook${total !== 1 ? 's' : ''}`
            )
          ) : searchQuery ? (
            `${series.length} series matching "${searchQuery}"`
          ) : (
            `${series.length} series`
          )}
        </p>
      </div>

      {/* Content grid */}
      {view === 'books' ? (
        loading ? (
          <BookGrid books={[]} loading={true} />
        ) : books.length > 0 ? (
          <BookGrid books={books} />
        ) : searchQuery ? (
          <div className="text-center py-12">
            <p className="text-netflix-light-gray">No books found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-netflix-light-gray">No books match your filters.</p>
          </div>
        )
      ) : (
        <SeriesGrid series={series} loading={loading} libraryUrl={getCurrentLibraryUrl()} />
      )}
    </div>
  );
}

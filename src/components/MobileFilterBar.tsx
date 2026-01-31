'use client';

import { useState } from 'react';
import { BookStatus, RatingFilter, SeriesRatingFilter, LibraryView } from '@/lib/types';
import FilterDrawer from './FilterDrawer';
import SortDrawer from './SortDrawer';

interface MobileFilterBarProps {
  view: LibraryView;
  // Books view filters
  statuses?: BookStatus[];
  bookRatingFilter?: RatingFilter;
  onStatusChange?: (statuses: BookStatus[]) => void;
  onBookRatingFilterChange?: (filter: RatingFilter) => void;
  // Series view filters
  seriesRatingFilter?: SeriesRatingFilter;
  completionStatus?: BookStatus | null;
  onSeriesRatingFilterChange?: (filter: SeriesRatingFilter) => void;
  onCompletionStatusChange?: (status: BookStatus | null) => void;
  // Sort
  sort: string;
  onSortChange: (sort: string) => void;
}

export default function MobileFilterBar({
  view,
  statuses = [],
  bookRatingFilter = 'all',
  onStatusChange,
  onBookRatingFilterChange,
  seriesRatingFilter = 'all',
  completionStatus,
  onSeriesRatingFilterChange,
  onCompletionStatusChange,
  sort,
  onSortChange,
}: MobileFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Count active filters
  const activeFilterCount =
    view === 'books'
      ? statuses.length + (bookRatingFilter !== 'all' ? 1 : 0)
      : (seriesRatingFilter !== 'all' ? 1 : 0) + (completionStatus ? 1 : 0);

  // Get current sort label
  const getSortLabel = () => {
    if (view === 'books') {
      const options: Record<string, string> = {
        'title-asc': 'Title A-Z',
        'title-desc': 'Title Z-A',
        'author-asc': 'Author',
        'author-desc': 'Author',
        'narrator-asc': 'Narrator',
        'narrator-desc': 'Narrator',
        'book_rating-desc': 'Rating',
        'book_rating-asc': 'Rating',
        'date_added-desc': 'Recent',
        'date_added-asc': 'Oldest',
        'series-asc': 'Series',
        'series-desc': 'Series',
      };
      return options[sort] || 'Sort';
    } else {
      const options: Record<string, string> = {
        'seriesName-asc': 'Name A-Z',
        'seriesName-desc': 'Name Z-A',
        'bookCount-desc': 'Books',
        'bookCount-asc': 'Books',
        'avgBookRating-desc': 'Rating',
        'avgBookRating-asc': 'Rating',
        'completionPercent-desc': 'Progress',
        'completionPercent-asc': 'Progress',
        'totalDurationSeconds-desc': 'Duration',
        'totalDurationSeconds-asc': 'Duration',
      };
      return options[sort] || 'Sort';
    }
  };

  return (
    <>
      <div className="md:hidden flex gap-2">
        {/* Filter button */}
        <button
          onClick={() => setFilterOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-netflix-gray rounded-lg min-h-[48px]"
        >
          <svg
            className="w-5 h-5 text-netflix-light-gray"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-white font-medium">
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-netflix-red rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </span>
        </button>

        {/* Sort button */}
        <button
          onClick={() => setSortOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-netflix-gray rounded-lg min-h-[48px]"
        >
          <svg
            className="w-5 h-5 text-netflix-light-gray"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          <span className="text-white font-medium">{getSortLabel()}</span>
        </button>
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        view={view}
        statuses={statuses}
        ratingFilter={view === 'books' ? bookRatingFilter : seriesRatingFilter}
        onStatusChange={onStatusChange}
        onRatingFilterChange={(filter) => {
          if (view === 'books') {
            onBookRatingFilterChange?.(filter as RatingFilter);
          } else {
            onSeriesRatingFilterChange?.(filter as SeriesRatingFilter);
          }
        }}
        completionStatus={completionStatus}
        onCompletionStatusChange={onCompletionStatusChange}
      />

      {/* Sort drawer */}
      <SortDrawer
        isOpen={sortOpen}
        onClose={() => setSortOpen(false)}
        view={view}
        value={sort}
        onChange={onSortChange}
      />
    </>
  );
}

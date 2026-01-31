'use client';

import { useEffect, useRef } from 'react';
import { BookStatus, RatingFilter, SeriesRatingFilter, LibraryView } from '@/lib/types';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  view: LibraryView;
  // Books view filters
  statuses?: BookStatus[];
  ratingFilter?: RatingFilter | SeriesRatingFilter;
  onStatusChange?: (statuses: BookStatus[]) => void;
  onRatingFilterChange?: (filter: RatingFilter | SeriesRatingFilter) => void;
  // Series view filters
  completionStatus?: BookStatus | null;
  onCompletionStatusChange?: (status: BookStatus | null) => void;
}

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
];

const BOOK_RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fullyRated', label: 'Fully Rated' },
  { value: 'unrated', label: 'Unrated' },
];

const SERIES_RATING_OPTIONS: { value: SeriesRatingFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fullyRated', label: 'Fully Rated' },
  { value: 'partlyRated', label: 'Partly Rated' },
  { value: 'unrated', label: 'Unrated' },
];

export default function FilterDrawer({
  isOpen,
  onClose,
  view,
  statuses = [],
  ratingFilter = 'all',
  onStatusChange,
  onRatingFilterChange,
  completionStatus,
  onCompletionStatusChange,
}: FilterDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStatusToggle = (status: BookStatus) => {
    if (!onStatusChange) return;
    const newStatuses = statuses.includes(status)
      ? statuses.filter((s) => s !== status)
      : [...statuses, status];
    onStatusChange(newStatuses);
  };

  const handleClearAll = () => {
    onStatusChange?.([]);
    onRatingFilterChange?.('all');
    onCompletionStatusChange?.(null);
  };

  const hasActiveFilters =
    statuses.length > 0 ||
    ratingFilter !== 'all' ||
    completionStatus !== null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute bottom-0 left-0 right-0 bg-netflix-dark rounded-t-2xl animate-slide-up max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-netflix-gray rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-netflix-gray/50">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-netflix-red text-sm font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filter sections */}
        <div className="p-4 space-y-6">
          {/* Status filter (books view only) */}
          {view === 'books' && onStatusChange && (
            <div>
              <h3 className="text-sm font-medium text-netflix-light-gray mb-3">
                Status
              </h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = statuses.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleStatusToggle(option.value)}
                      className={`
                        px-4 py-3 rounded-lg text-sm font-medium min-h-[48px]
                        ${isActive
                          ? 'bg-netflix-red text-white'
                          : 'bg-netflix-gray text-netflix-light-gray'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completion filter (series view only) */}
          {view === 'series' && onCompletionStatusChange && (
            <div>
              <h3 className="text-sm font-medium text-netflix-light-gray mb-3">
                Completion Status
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onCompletionStatusChange(null)}
                  className={`
                    px-4 py-3 rounded-lg text-sm font-medium min-h-[48px]
                    ${completionStatus === null
                      ? 'bg-netflix-red text-white'
                      : 'bg-netflix-gray text-netflix-light-gray'
                    }
                  `}
                >
                  All
                </button>
                {STATUS_OPTIONS.map((option) => {
                  const isActive = completionStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => onCompletionStatusChange(option.value)}
                      className={`
                        px-4 py-3 rounded-lg text-sm font-medium min-h-[48px]
                        ${isActive
                          ? 'bg-netflix-red text-white'
                          : 'bg-netflix-gray text-netflix-light-gray'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating filter */}
          {onRatingFilterChange && (
            <div>
              <h3 className="text-sm font-medium text-netflix-light-gray mb-3">
                Rating
              </h3>
              <div className="flex flex-wrap gap-2">
                {(view === 'books' ? BOOK_RATING_OPTIONS : SERIES_RATING_OPTIONS).map(
                  (option) => {
                    const isActive = ratingFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => onRatingFilterChange(option.value as RatingFilter & SeriesRatingFilter)}
                        className={`
                          px-4 py-3 rounded-lg text-sm font-medium min-h-[48px]
                          ${isActive
                            ? 'bg-netflix-red text-white'
                            : 'bg-netflix-gray text-netflix-light-gray'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>

        {/* Apply button */}
        <div className="p-4 border-t border-netflix-gray/50">
          <button
            onClick={onClose}
            className="w-full py-4 bg-netflix-red text-white font-semibold rounded-lg min-h-[52px]"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

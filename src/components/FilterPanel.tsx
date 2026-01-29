'use client';

import { BookStatus, RatingFilter, SeriesRatingFilter } from '@/lib/types';

interface BookFiltersProps {
  view: 'books';
  statuses: BookStatus[];
  ratingFilter: RatingFilter;
  onStatusChange: (statuses: BookStatus[]) => void;
  onRatingFilterChange: (filter: RatingFilter) => void;
}

interface SeriesFiltersProps {
  view: 'series';
  ratingFilter: SeriesRatingFilter;
  completionStatus: BookStatus | null;
  onRatingFilterChange: (filter: SeriesRatingFilter) => void;
  onCompletionStatusChange: (status: BookStatus | null) => void;
}

type FilterPanelProps = BookFiltersProps | SeriesFiltersProps;

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
];

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
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

export default function FilterPanel(props: FilterPanelProps) {
  if (props.view === 'books') {
    return <BookFilters {...props} />;
  }
  return <SeriesFilters {...props} />;
}

function BookFilters({
  statuses,
  ratingFilter,
  onStatusChange,
  onRatingFilterChange,
}: BookFiltersProps) {
  const toggleStatus = (status: BookStatus) => {
    if (statuses.includes(status)) {
      onStatusChange(statuses.filter(s => s !== status));
    } else {
      onStatusChange([...statuses, status]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Status multi-select chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-netflix-light-gray/70 uppercase tracking-wide">Status:</span>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleStatus(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                statuses.includes(opt.value)
                  ? 'bg-netflix-red text-white'
                  : 'bg-netflix-gray text-netflix-light-gray hover:bg-netflix-gray/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating filter dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-netflix-light-gray/70 uppercase tracking-wide">Rating:</span>
        <select
          value={ratingFilter}
          onChange={e => onRatingFilterChange(e.target.value as RatingFilter)}
          className="bg-netflix-gray text-white text-sm rounded px-3 py-1 border-0 focus:ring-1 focus:ring-netflix-red"
        >
          {RATING_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick toggle: Hide finished */}
      {statuses.length === 0 && (
        <button
          onClick={() => onStatusChange(['not_started', 'in_progress'])}
          className="px-3 py-1 text-xs font-medium rounded-full bg-netflix-gray text-netflix-light-gray hover:bg-netflix-gray/80 transition-colors"
        >
          Hide Finished
        </button>
      )}
      {statuses.length === 2 &&
        statuses.includes('not_started') &&
        statuses.includes('in_progress') && (
          <button
            onClick={() => onStatusChange([])}
            className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Show All
          </button>
        )}
    </div>
  );
}

function SeriesFilters({
  ratingFilter,
  completionStatus,
  onRatingFilterChange,
  onCompletionStatusChange,
}: SeriesFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Rating filter chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-netflix-light-gray/70 uppercase tracking-wide">Rating:</span>
        <div className="flex gap-1">
          {SERIES_RATING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onRatingFilterChange(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                ratingFilter === opt.value
                  ? 'bg-netflix-red text-white'
                  : 'bg-netflix-gray text-netflix-light-gray hover:bg-netflix-gray/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Completion status chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-netflix-light-gray/70 uppercase tracking-wide">Progress:</span>
        <div className="flex gap-1">
          <button
            onClick={() => onCompletionStatusChange(null)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              completionStatus === null
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-gray text-netflix-light-gray hover:bg-netflix-gray/80'
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onCompletionStatusChange(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                completionStatus === opt.value
                  ? 'bg-netflix-red text-white'
                  : 'bg-netflix-gray text-netflix-light-gray hover:bg-netflix-gray/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

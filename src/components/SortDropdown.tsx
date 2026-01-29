'use client';

import { LibraryView } from '@/lib/types';

interface SortOption {
  value: string;
  label: string;
}

const BOOK_SORT_OPTIONS: SortOption[] = [
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'author-asc', label: 'Author (A-Z)' },
  { value: 'author-desc', label: 'Author (Z-A)' },
  { value: 'narrator-asc', label: 'Narrator (A-Z)' },
  { value: 'narrator-desc', label: 'Narrator (Z-A)' },
  { value: 'book_rating-desc', label: 'Rating (High-Low)' },
  { value: 'book_rating-asc', label: 'Rating (Low-High)' },
  { value: 'date_added-desc', label: 'Date Added (Newest)' },
  { value: 'date_added-asc', label: 'Date Added (Oldest)' },
  { value: 'status-asc', label: 'Status (Not Started First)' },
  { value: 'status-desc', label: 'Status (Finished First)' },
];

const SERIES_SORT_OPTIONS: SortOption[] = [
  { value: 'seriesName-asc', label: 'Name (A-Z)' },
  { value: 'seriesName-desc', label: 'Name (Z-A)' },
  { value: 'bookCount-desc', label: 'Book Count (Most)' },
  { value: 'bookCount-asc', label: 'Book Count (Least)' },
  { value: 'totalDurationSeconds-desc', label: 'Duration (Longest)' },
  { value: 'totalDurationSeconds-asc', label: 'Duration (Shortest)' },
  { value: 'avgBookRating-desc', label: 'Rating (High-Low)' },
  { value: 'avgBookRating-asc', label: 'Rating (Low-High)' },
  { value: 'completionPercent-desc', label: 'Completion (High-Low)' },
  { value: 'completionPercent-asc', label: 'Completion (Low-High)' },
];

const SERIES_DETAIL_SORT_OPTIONS: SortOption[] = [
  { value: 'series_book_number-asc', label: 'Series Order' },
  ...BOOK_SORT_OPTIONS,
];

interface SortDropdownProps {
  view: LibraryView | 'series-detail';
  value: string;
  onChange: (value: string) => void;
}

export default function SortDropdown({ view, value, onChange }: SortDropdownProps) {
  const options =
    view === 'series'
      ? SERIES_SORT_OPTIONS
      : view === 'series-detail'
      ? SERIES_DETAIL_SORT_OPTIONS
      : BOOK_SORT_OPTIONS;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-netflix-light-gray/70 uppercase tracking-wide">Sort:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-netflix-gray text-white text-sm rounded px-3 py-1.5 border-0 focus:ring-1 focus:ring-netflix-red"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

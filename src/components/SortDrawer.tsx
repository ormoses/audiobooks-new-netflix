'use client';

import { useEffect, useRef } from 'react';
import { LibraryView } from '@/lib/types';

interface SortDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  view: LibraryView;
  value: string;
  onChange: (value: string) => void;
}

const BOOK_SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'author-asc', label: 'Author (A-Z)' },
  { value: 'author-desc', label: 'Author (Z-A)' },
  { value: 'narrator-asc', label: 'Narrator (A-Z)' },
  { value: 'narrator-desc', label: 'Narrator (Z-A)' },
  { value: 'book_rating-desc', label: 'Rating (High to Low)' },
  { value: 'book_rating-asc', label: 'Rating (Low to High)' },
  { value: 'date_added-desc', label: 'Date Added (Newest)' },
  { value: 'date_added-asc', label: 'Date Added (Oldest)' },
  { value: 'series-asc', label: 'Series (A-Z)' },
  { value: 'series-desc', label: 'Series (Z-A)' },
];

const SERIES_SORT_OPTIONS = [
  { value: 'seriesName-asc', label: 'Name (A-Z)' },
  { value: 'seriesName-desc', label: 'Name (Z-A)' },
  { value: 'bookCount-desc', label: 'Books (Most)' },
  { value: 'bookCount-asc', label: 'Books (Fewest)' },
  { value: 'avgBookRating-desc', label: 'Rating (High to Low)' },
  { value: 'avgBookRating-asc', label: 'Rating (Low to High)' },
  { value: 'completionPercent-desc', label: 'Completion (Most)' },
  { value: 'completionPercent-asc', label: 'Completion (Least)' },
  { value: 'totalDurationSeconds-desc', label: 'Duration (Longest)' },
  { value: 'totalDurationSeconds-asc', label: 'Duration (Shortest)' },
];

export default function SortDrawer({
  isOpen,
  onClose,
  view,
  value,
  onChange,
}: SortDrawerProps) {
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

  const options = view === 'books' ? BOOK_SORT_OPTIONS : SERIES_SORT_OPTIONS;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    onClose();
  };

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
        <div className="px-4 pb-4 border-b border-netflix-gray/50">
          <h2 className="text-lg font-semibold text-white">Sort By</h2>
        </div>

        {/* Options list */}
        <div className="py-2">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full flex items-center justify-between px-4 py-4 min-h-[56px]
                  ${isSelected ? 'bg-netflix-gray/50' : ''}
                `}
              >
                <span
                  className={`text-base ${
                    isSelected ? 'text-netflix-red font-medium' : 'text-white'
                  }`}
                >
                  {option.label}
                </span>
                {isSelected && (
                  <svg
                    className="w-5 h-5 text-netflix-red"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

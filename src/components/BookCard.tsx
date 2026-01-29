'use client';

import Link from 'next/link';
import { BookSummary } from '@/lib/types';
import { formatDuration } from '@/lib/formatters';
import StatusBadge from './StatusBadge';
import StarRating from './StarRating';

interface BookCardProps {
  book: BookSummary;
  seriesKey?: string; // For back navigation from book detail
  libraryUrl?: string; // Original library URL for back navigation
}

export default function BookCard({ book, seriesKey, libraryUrl }: BookCardProps) {
  const duration = formatDuration(book.duration_seconds);

  // Build href with navigation context
  let href = `/book/${book.id}`;
  const params = new URLSearchParams();
  if (libraryUrl) params.set('from', libraryUrl);
  if (seriesKey) params.set('seriesKey', seriesKey);
  if (params.toString()) {
    href += `?${params.toString()}`;
  }

  return (
    <Link
      href={href}
      className="group block bg-netflix-dark rounded-md overflow-hidden hover:scale-105 hover:z-10 transition-transform duration-200"
    >
      {/* Placeholder cover */}
      <div className="aspect-[2/3] bg-netflix-gray flex items-center justify-center relative">
        <svg
          className="w-16 h-16 text-netflix-light-gray/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>

        {/* Status badge - top left */}
        <div className="absolute top-2 left-2">
          <StatusBadge status={book.status} size="sm" />
        </div>

        {/* Duplicate badge - top right */}
        {book.is_duplicate && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-600 text-white text-xs font-medium rounded">
            Duplicate
          </div>
        )}

        {/* Rating - bottom left */}
        {book.book_rating && (
          <div className="absolute bottom-2 left-2 bg-black/70 rounded px-1.5 py-0.5">
            <StarRating rating={book.book_rating} readonly size="sm" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-medium">View Details</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-netflix-red transition-colors">
          {book.title}
        </h3>

        {book.author && (
          <p className="text-netflix-light-gray text-xs mt-1 line-clamp-1">
            {book.author}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          {book.series ? (
            <span className="text-xs text-netflix-light-gray/70 line-clamp-1 flex-1 mr-2">
              {book.series}
              {book.series_book_number && ` #${book.series_book_number}`}
            </span>
          ) : (
            <span className="flex-1" />
          )}

          <span className="text-xs text-netflix-light-gray/70 whitespace-nowrap">
            {duration}
          </span>
        </div>
      </div>
    </Link>
  );
}

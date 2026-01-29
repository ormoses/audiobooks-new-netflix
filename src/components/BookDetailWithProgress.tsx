'use client';

import { useState, useEffect } from 'react';
import { BookWithRatings } from '@/lib/types';
import { formatDuration, formatFileSize, formatDateShort } from '@/lib/formatters';
import BookDetailClient from './BookDetailClient';
import BookProgressSection from './BookProgressSection';
import StatusBadge from './StatusBadge';
import StarRating from './StarRating';

interface BookDetailWithProgressProps {
  initialBook: BookWithRatings;
}

export default function BookDetailWithProgress({ initialBook }: BookDetailWithProgressProps) {
  const [book, setBook] = useState<BookWithRatings>(initialBook);

  // Sync local state when initialBook changes (e.g., after navigation)
  useEffect(() => {
    setBook(initialBook);
  }, [initialBook]);

  return (
    <>
      {/* Header */}
      <div className="flex gap-6 mb-8">
        {/* Placeholder cover */}
        <div className="flex-shrink-0 w-48 h-72 bg-netflix-gray rounded-md flex items-center justify-center relative">
          <svg
            className="w-20 h-20 text-netflix-light-gray/50"
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

          {/* Status badge overlay */}
          <div className="absolute top-2 left-2">
            <StatusBadge status={book.status} size="sm" />
          </div>

          {/* Rating overlay */}
          {book.book_rating && (
            <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1">
              <StarRating rating={book.book_rating} readonly size="sm" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-white mb-2">{book.title}</h1>

          {book.author && (
            <p className="text-xl text-netflix-light-gray mb-4">by {book.author}</p>
          )}

          {/* Series info */}
          {book.series && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-netflix-gray rounded-full text-sm">
                <span className="text-netflix-light-gray">{book.series}</span>
                {book.series_book_number && (
                  <span className="text-white font-medium">#{book.series_book_number}</span>
                )}
                {book.series_ended !== null && (
                  <span className={`text-xs ${book.series_ended ? 'text-green-400' : 'text-yellow-400'}`}>
                    {book.series_ended ? 'Completed' : 'Ongoing'}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Narrator */}
          {book.narrator && (
            <p className="text-netflix-light-gray mb-2">
              <span className="text-netflix-light-gray/70">Narrated by:</span> {book.narrator}
            </p>
          )}

          {/* Duration */}
          <p className="text-netflix-light-gray mb-4">
            <span className="text-netflix-light-gray/70">Duration:</span>{' '}
            {formatDuration(book.duration_seconds)}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {book.is_duplicate && (
              <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded">
                Duplicate
              </span>
            )}
            <span className="px-2 py-1 bg-netflix-gray text-netflix-light-gray text-xs rounded">
              {book.type}
            </span>
          </div>

          {/* Actions */}
          <BookDetailClient book={book} />
        </div>
      </div>

      {/* Progress & Ratings section */}
      <div className="mb-8">
        <BookProgressSection book={book} onUpdate={setBook} />
      </div>

      {/* File info section */}
      <div className="bg-netflix-dark rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">File Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Path */}
          <div className="md:col-span-2">
            <p className="text-sm text-netflix-light-gray/70 mb-1">Path</p>
            <p className="text-white text-sm font-mono bg-netflix-gray/50 px-3 py-2 rounded break-all">
              {book.path}
            </p>
          </div>

          {/* Type */}
          <div>
            <p className="text-sm text-netflix-light-gray/70 mb-1">Type</p>
            <p className="text-white">{book.type}</p>
          </div>

          {/* File count */}
          <div>
            <p className="text-sm text-netflix-light-gray/70 mb-1">File Count</p>
            <p className="text-white">{book.file_count ?? 'Unknown'}</p>
          </div>

          {/* Total size */}
          <div>
            <p className="text-sm text-netflix-light-gray/70 mb-1">Total Size</p>
            <p className="text-white">{formatFileSize(book.total_size_bytes)}</p>
          </div>

          {/* Has embedded cover */}
          <div>
            <p className="text-sm text-netflix-light-gray/70 mb-1">Embedded Cover</p>
            <p className="text-white">
              {book.has_embedded_cover === null
                ? 'Unknown'
                : book.has_embedded_cover
                ? 'Yes'
                : 'No'}
            </p>
          </div>

          {/* Source */}
          <div>
            <p className="text-sm text-netflix-light-gray/70 mb-1">Source</p>
            <p className="text-white capitalize">{book.source}</p>
          </div>

          {/* Date added */}
          <div>
            <p className="text-sm text-netflix-light-gray/70 mb-1">Date Added</p>
            <p className="text-white text-sm">
              {formatDateShort(book.date_added)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

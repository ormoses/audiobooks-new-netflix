'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SeriesStats } from '@/lib/types';
import { formatDuration } from '@/lib/formatters';
import StatusBadge from './StatusBadge';

interface SeriesCardProps {
  series: SeriesStats;
  libraryUrl?: string; // Current library URL to preserve on back navigation
}

export default function SeriesCard({ series, libraryUrl }: SeriesCardProps) {
  const [imageError, setImageError] = useState(false);
  const duration = formatDuration(series.totalDurationSeconds);
  const isStandalone = series.seriesKey === 'standalone';
  const hasCover = series.coverBookId !== null && !imageError;

  // Build cover URL with cache-busting
  const coverUrl = hasCover
    ? `/api/covers/${series.coverBookId}?v=${encodeURIComponent(series.coverUpdatedAt ?? '')}`
    : null;

  // Build href with from parameter to preserve library state
  const href = libraryUrl
    ? `/series/${series.seriesKey}?from=${encodeURIComponent(libraryUrl)}`
    : `/series/${series.seriesKey}`;

  // Format series rating
  const ratingDisplay =
    series.avgBookRating !== null
      ? `${series.avgBookRating.toFixed(2)} (${series.ratedCount} of ${series.bookCount} rated)`
      : `\u2014 (0 of ${series.bookCount} rated)`;

  // Progress percentage
  const progressPercent = series.completionPercent;

  return (
    <Link
      href={href}
      className="group block bg-netflix-dark rounded-md overflow-hidden hover:scale-105 hover:z-10 transition-transform duration-200"
    >
      {/* Cover image or placeholder */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-gray-900 flex items-center justify-center">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={series.seriesName}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-center p-4">
            {isStandalone ? (
              <svg
                className="w-12 h-12 mx-auto text-netflix-light-gray/50 mb-2"
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
            ) : (
              <svg
                className="w-12 h-12 mx-auto text-netflix-light-gray/50 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            )}
            <span className="text-netflix-light-gray/70 text-sm">
              {series.bookCount} {series.bookCount === 1 ? 'book' : 'books'}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <StatusBadge status={series.completionStatus} size="sm" />
        </div>

        {/* Unrated badge */}
        {series.unratedCount > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-600 text-white text-xs font-medium rounded">
            {series.unratedCount} unrated
          </div>
        )}

        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-netflix-gray">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-medium">View Series</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-netflix-red transition-colors">
          {series.seriesName}
        </h3>

        <p className="text-netflix-light-gray text-xs mt-1">
          {series.bookCount} {series.bookCount === 1 ? 'book' : 'books'} &bull; {duration}
        </p>

        {/* Progress */}
        <p className="text-netflix-light-gray/70 text-xs mt-1">
          {series.finishedCount} of {series.bookCount} finished
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2 text-xs">
          <svg
            className="w-3.5 h-3.5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-netflix-light-gray">{ratingDisplay}</span>
        </div>
      </div>
    </Link>
  );
}

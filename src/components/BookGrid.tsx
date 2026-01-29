'use client';

import { BookSummary } from '@/lib/types';
import BookCard from './BookCard';

interface BookGridProps {
  books: BookSummary[];
  loading?: boolean;
  seriesKey?: string; // For back navigation from book detail
  libraryUrl?: string; // Original library URL for back navigation
}

// Loading skeleton card
function SkeletonCard() {
  return (
    <div className="bg-netflix-dark rounded-md overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-netflix-gray" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-netflix-gray rounded w-3/4" />
        <div className="h-3 bg-netflix-gray rounded w-1/2" />
        <div className="h-3 bg-netflix-gray rounded w-1/3" />
      </div>
    </div>
  );
}

export default function BookGrid({ books, loading, seriesKey, libraryUrl }: BookGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {books.map((book) => (
        <BookCard key={book.id} book={book} seriesKey={seriesKey} libraryUrl={libraryUrl} />
      ))}
    </div>
  );
}

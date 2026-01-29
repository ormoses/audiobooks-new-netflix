'use client';

import { useState, useCallback, useEffect } from 'react';
import { BookSummary } from '@/lib/types';
import SearchBar from './SearchBar';
import BookGrid from './BookGrid';
import Link from 'next/link';

interface LibraryClientProps {
  initialBooks: BookSummary[];
  initialTotal: number;
}

export default function LibraryClient({ initialBooks, initialTotal }: LibraryClientProps) {
  const [books, setBooks] = useState<BookSummary[]>(initialBooks);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch books with search
  const fetchBooks = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
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
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    fetchBooks(query);
  }, [fetchBooks]);

  // Empty state - no books at all
  if (total === 0 && !searchQuery && !loading) {
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
        <h2 className="text-2xl font-semibold text-white mb-3">
          No audiobooks yet
        </h2>
        <p className="text-netflix-light-gray max-w-md mb-6">
          Import your audiobook library to start browsing. Go to Settings to
          import your CSV catalog file.
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
    <div className="space-y-6">
      {/* Search bar */}
      <div className="max-w-xl">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-netflix-light-gray text-sm">
          {loading ? (
            'Loading...'
          ) : searchQuery ? (
            `${books.length} result${books.length !== 1 ? 's' : ''} for "${searchQuery}"`
          ) : (
            `${total} audiobook${total !== 1 ? 's' : ''}`
          )}
        </p>
      </div>

      {/* Books grid or empty search state */}
      {loading ? (
        <BookGrid books={[]} loading={true} />
      ) : books.length > 0 ? (
        <BookGrid books={books} />
      ) : searchQuery ? (
        <div className="text-center py-12">
          <p className="text-netflix-light-gray">
            No books found matching "{searchQuery}"
          </p>
        </div>
      ) : null}
    </div>
  );
}

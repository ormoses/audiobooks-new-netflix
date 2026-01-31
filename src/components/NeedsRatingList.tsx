'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { NeedsRatingBook, NarratorRating } from '@/lib/types';
import { formatDuration } from '@/lib/formatters';
import StarRating from './StarRating';
import { useToast } from './Toast';

export default function NeedsRatingList() {
  const [books, setBooks] = useState<NeedsRatingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingBookId, setSavingBookId] = useState<number | null>(null);
  const { showToast } = useToast();

  const fetchBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/needs-rating');
      const data = await response.json();

      if (data.ok) {
        setBooks(data.books);
      } else {
        setError(data.error || 'Failed to fetch books');
      }
    } catch (err) {
      setError('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const updateBookRating = async (bookId: number, rating: number | null) => {
    setSavingBookId(bookId);
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_rating: rating }),
      });

      if (response.status === 401) {
        showToast('Please login to edit', 'error');
        return;
      }

      if (response.ok) {
        // Update local state
        setBooks((prev) =>
          prev.map((book) =>
            book.id === bookId ? { ...book, book_rating: rating } : book
          ).filter((book) => {
            // Remove from list if fully rated
            const hasBookRating = book.book_rating !== null;
            const hasAllNarratorRatings = book.narrators.every(
              (n) => book.narratorRatings[n] !== null && book.narratorRatings[n] !== undefined
            );
            return !(hasBookRating && hasAllNarratorRatings);
          })
        );
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update rating', 'error');
      }
    } catch (err) {
      console.error('Error updating book rating:', err);
      showToast('Failed to update rating', 'error');
    } finally {
      setSavingBookId(null);
    }
  };

  const updateNarratorRating = async (bookId: number, narratorName: string, rating: number | null) => {
    setSavingBookId(bookId);
    try {
      const response = await fetch(`/api/books/${bookId}/narrator-ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratings: [{ narratorName, rating }] as NarratorRating[],
        }),
      });

      if (response.status === 401) {
        showToast('Please login to edit', 'error');
        return;
      }

      if (response.ok) {
        // Update local state
        setBooks((prev) =>
          prev.map((book) => {
            if (book.id !== bookId) return book;
            const newRatings = { ...book.narratorRatings, [narratorName]: rating };
            return { ...book, narratorRatings: newRatings };
          }).filter((book) => {
            // Remove from list if fully rated
            const hasBookRating = book.book_rating !== null;
            const hasAllNarratorRatings = book.narrators.every(
              (n) => book.narratorRatings[n] !== null && book.narratorRatings[n] !== undefined
            );
            return !(hasBookRating && hasAllNarratorRatings);
          })
        );
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update rating', 'error');
      }
    } catch (err) {
      console.error('Error updating narrator rating:', err);
      showToast('Failed to update rating', 'error');
    } finally {
      setSavingBookId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchBooks();
          }}
          className="mt-4 px-4 py-2 bg-netflix-red text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-netflix-gray flex items-center justify-center">
          <svg
            className="w-12 h-12 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">
          All caught up!
        </h2>
        <p className="text-netflix-light-gray max-w-md">
          All your finished books have been rated. When you finish listening to a new book,
          it will appear here for rating.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-netflix-light-gray mb-6">
        {books.length} book{books.length !== 1 ? 's' : ''} need{books.length === 1 ? 's' : ''} rating
      </p>

      {books.map((book) => {
        const isSaving = savingBookId === book.id;
        const missingBookRating = book.book_rating === null;
        const missingNarratorRatings = book.narrators.filter(
          (n) => book.narratorRatings[n] === null || book.narratorRatings[n] === undefined
        );

        return (
          <div
            key={book.id}
            className={`bg-netflix-dark rounded-lg p-4 ${isSaving ? 'opacity-70' : ''}`}
          >
            <div className="flex gap-4">
              {/* Book info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/book/${book.id}`}
                  className="text-white font-medium hover:text-netflix-red transition-colors line-clamp-1"
                >
                  {book.title}
                </Link>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-netflix-light-gray mt-1">
                  {book.author && <span>{book.author}</span>}
                  {book.series && (
                    <span>
                      {book.series}
                      {book.series_book_number && ` #${book.series_book_number}`}
                    </span>
                  )}
                  <span>{formatDuration(book.duration_seconds)}</span>
                </div>
              </div>
            </div>

            {/* Rating controls */}
            <div className="mt-4 space-y-3">
              {/* Book rating */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-800 rounded-lg px-4 py-3">
                <span className="text-white text-sm flex items-center gap-2">
                  Book Rating
                  {missingBookRating && (
                    <span className="text-xs text-yellow-400">Needs rating</span>
                  )}
                </span>
                <div className="flex justify-end">
                  <StarRating
                    rating={book.book_rating}
                    onChange={(rating) => updateBookRating(book.id, rating)}
                    size="md"
                    showClear
                  />
                </div>
              </div>

              {/* Narrator ratings */}
              {book.narrators.map((narrator) => {
                const needsRating = book.narratorRatings[narrator] === null ||
                                    book.narratorRatings[narrator] === undefined;
                return (
                  <div
                    key={narrator}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-800 rounded-lg px-4 py-3"
                  >
                    <span className="text-white text-sm flex items-center gap-2 truncate">
                      {narrator}
                      {needsRating && (
                        <span className="text-xs text-yellow-400 flex-shrink-0">Needs rating</span>
                      )}
                    </span>
                    <div className="flex justify-end">
                      <StarRating
                        rating={book.narratorRatings[narrator] ?? null}
                        onChange={(rating) => updateNarratorRating(book.id, narrator, rating)}
                        size="md"
                        showClear
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookWithRatings, BookStatus, NarratorRating } from '@/lib/types';
import StatusSelect from './StatusSelect';
import StarRating from './StarRating';

interface BookProgressSectionProps {
  book: BookWithRatings;
  onUpdate: (updatedBook: BookWithRatings) => void;
}

export default function BookProgressSection({ book, onUpdate }: BookProgressSectionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const showSaveIndicator = useCallback(() => {
    setLastSaved(new Date().toLocaleTimeString());
    setTimeout(() => setLastSaved(null), 2000);
  }, []);

  const updateBookField = async (updates: { status?: BookStatus; book_rating?: number | null }) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.book) {
          onUpdate({
            ...data.book,
            narrators: book.narrators,
            narratorRatings: book.narratorRatings,
          });
          showSaveIndicator();
          router.refresh(); // Invalidate router cache for fresh data on re-navigation
        }
      }
    } catch (error) {
      console.error('Error updating book:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateNarratorRating = async (narratorName: string, rating: number | null) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/books/${book.id}/narrator-ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratings: [{ narratorName, rating }] as NarratorRating[],
        }),
      });

      if (response.ok) {
        const newNarratorRatings = {
          ...book.narratorRatings,
          [narratorName]: rating,
        };
        onUpdate({
          ...book,
          narratorRatings: newNarratorRatings,
        });
        showSaveIndicator();
        router.refresh(); // Invalidate router cache for fresh data on re-navigation
      }
    } catch (error) {
      console.error('Error updating narrator rating:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (status: BookStatus) => {
    updateBookField({ status });
  };

  const handleBookRatingChange = (rating: number | null) => {
    updateBookField({ book_rating: rating });
  };

  return (
    <div className="bg-netflix-dark rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Progress & Ratings</h2>
        {saving && (
          <span className="text-sm text-gray-400">Saving...</span>
        )}
        {!saving && lastSaved && (
          <span className="text-sm text-green-400">Saved</span>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Status</label>
        <StatusSelect
          status={book.status}
          onChange={handleStatusChange}
          disabled={saving}
        />
      </div>

      {/* Book Rating */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Book Rating</label>
        <div className="flex items-center gap-3">
          <StarRating
            rating={book.book_rating}
            onChange={handleBookRatingChange}
            size="lg"
            showClear
          />
          {book.book_rating && (
            <span className="text-gray-400 text-sm">{book.book_rating}/5</span>
          )}
        </div>
      </div>

      {/* Narrator Ratings */}
      {book.narrators.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Narrator Rating{book.narrators.length > 1 ? 's' : ''}
          </label>
          <div className="space-y-3">
            {book.narrators.map((narrator) => (
              <div key={narrator} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <span className="text-white text-sm">{narrator}</span>
                <div className="flex items-center gap-3">
                  <StarRating
                    rating={book.narratorRatings[narrator] ?? null}
                    onChange={(rating) => updateNarratorRating(narrator, rating)}
                    size="md"
                    showClear
                  />
                  {book.narratorRatings[narrator] && (
                    <span className="text-gray-400 text-sm w-8">
                      {book.narratorRatings[narrator]}/5
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

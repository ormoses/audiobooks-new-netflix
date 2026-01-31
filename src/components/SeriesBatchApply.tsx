'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookSummaryWithNarrators,
  BookStatus,
  ApplyMode,
  BatchApplyPreview,
} from '@/lib/types';
import StarRating from './StarRating';
import { useToast } from './Toast';

interface SeriesBatchApplyProps {
  isOpen: boolean;
  onClose: () => void;
  seriesKey: string;
  seriesName: string;
  books: BookSummaryWithNarrators[];
}

type StatusOption = 'unchanged' | BookStatus;
type RatingOption = 'unchanged' | 'clear' | 1 | 2 | 3 | 4 | 5;

const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: 'unchanged', label: 'Leave unchanged' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
];

export default function SeriesBatchApply({
  isOpen,
  onClose,
  seriesKey,
  seriesName,
  books,
}: SeriesBatchApplyProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [status, setStatus] = useState<StatusOption>('unchanged');
  const [bookRating, setBookRating] = useState<RatingOption>('unchanged');
  const [narratorRating, setNarratorRating] = useState<RatingOption>('unchanged');
  const [applyMode, setApplyMode] = useState<ApplyMode>('missingOnly');
  const [isApplying, setIsApplying] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setStatus('unchanged');
      setBookRating('unchanged');
      setNarratorRating('unchanged');
      setApplyMode('missingOnly');
    }
  }, [isOpen]);

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

  // Compute preview
  const preview = useMemo((): BatchApplyPreview => {
    const isMissingOnly = applyMode === 'missingOnly';

    let statusChanges = 0;
    let bookRatingChanges = 0;
    let narratorRatingChanges = 0;

    for (const book of books) {
      // Status changes
      if (status !== 'unchanged') {
        if (!isMissingOnly || book.status !== status) {
          statusChanges++;
        }
      }

      // Book rating changes
      if (bookRating !== 'unchanged') {
        const targetRating = bookRating === 'clear' ? null : bookRating;
        if (isMissingOnly) {
          if (targetRating !== null && book.book_rating === null) {
            bookRatingChanges++;
          } else if (targetRating === null && book.book_rating !== null) {
            bookRatingChanges++;
          }
        } else {
          bookRatingChanges++;
        }
      }

      // Narrator rating changes
      if (narratorRating !== 'unchanged') {
        const targetRating = narratorRating === 'clear' ? null : narratorRating;
        for (const narrator of book.narrators) {
          const currentRating = book.narratorRatings[narrator];
          if (isMissingOnly) {
            if (targetRating !== null && (currentRating === undefined || currentRating === null)) {
              narratorRatingChanges++;
            } else if (targetRating === null && currentRating !== undefined && currentRating !== null) {
              narratorRatingChanges++;
            }
          } else {
            narratorRatingChanges++;
          }
        }
      }
    }

    return {
      totalBooks: books.length,
      statusChanges,
      bookRatingChanges,
      narratorRatingChanges,
    };
  }, [books, status, bookRating, narratorRating, applyMode]);

  const hasChanges =
    status !== 'unchanged' ||
    bookRating !== 'unchanged' ||
    narratorRating !== 'unchanged';

  const handleApply = async () => {
    if (!hasChanges) return;

    setIsApplying(true);
    try {
      const body: Record<string, unknown> = {
        applyMode,
      };

      if (status !== 'unchanged') {
        body.status = status;
      }
      if (bookRating !== 'unchanged') {
        body.bookRating = bookRating === 'clear' ? null : bookRating;
      }
      if (narratorRating !== 'unchanged') {
        body.narratorRating = narratorRating === 'clear' ? null : narratorRating;
      }

      const response = await fetch(`/api/series/${seriesKey}/batch-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        showToast('Please login to edit', 'error');
        return;
      }

      const data = await response.json();

      if (data.ok) {
        const { updated } = data;
        const parts = [];
        if (updated.statuses > 0) parts.push(`${updated.statuses} status`);
        if (updated.bookRatings > 0) parts.push(`${updated.bookRatings} book rating`);
        if (updated.narratorRatings > 0) parts.push(`${updated.narratorRatings} narrator rating`);

        const message = parts.length > 0
          ? `Updated: ${parts.join(', ')}`
          : 'No changes needed';

        showToast(message, 'success');
        onClose();
        router.refresh();
      } else {
        showToast(data.error || 'Failed to apply changes', 'error');
      }
    } catch (error) {
      console.error('Error applying batch changes:', error);
      showToast('Failed to apply changes', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Convert rating option to display value for StarRating
  const getRatingValue = (option: RatingOption): number | null => {
    if (option === 'unchanged' || option === 'clear') return null;
    return option;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal/Drawer - responsive */}
      <div
        ref={drawerRef}
        className="
          absolute bg-netflix-dark flex flex-col
          md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          md:rounded-xl md:max-w-lg md:w-full
          bottom-0 left-0 right-0 md:bottom-auto
          rounded-t-2xl md:rounded-b-xl
          animate-slide-up md:animate-fade-in
          max-h-[85vh] md:max-h-[80vh]
        "
      >
        {/* Handle bar (mobile only) */}
        <div className="flex-shrink-0 flex justify-center py-3 md:hidden">
          <div className="w-10 h-1 bg-netflix-gray rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 pb-4 pt-0 md:pt-6 border-b border-netflix-gray/50">
          <div>
            <h2 className="text-lg font-semibold text-white">Batch Apply</h2>
            <p className="text-sm text-netflix-light-gray mt-1 truncate max-w-[250px] md:max-w-none">
              {seriesName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-full hover:bg-netflix-gray transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-netflix-light-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusOption)}
              className="w-full bg-gray-700 text-white text-sm rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 min-h-[48px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Book Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Book Rating
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={bookRating === 'unchanged' ? 'unchanged' : bookRating === 'clear' ? 'clear' : 'set'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'unchanged') setBookRating('unchanged');
                  else if (val === 'clear') setBookRating('clear');
                  else setBookRating(3); // Default to 3 stars when choosing to set
                }}
                className="bg-gray-700 text-white text-sm rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 min-h-[48px]"
              >
                <option value="unchanged">Leave unchanged</option>
                <option value="set">Set rating</option>
                <option value="clear">Clear rating</option>
              </select>
              {bookRating !== 'unchanged' && bookRating !== 'clear' && (
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={getRatingValue(bookRating)}
                    onChange={(r) => setBookRating(r === null ? 'clear' : (r as RatingOption))}
                    size="lg"
                  />
                  <span className="text-gray-400 text-sm">{bookRating}/5</span>
                </div>
              )}
            </div>
          </div>

          {/* Narrator Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Narrator Rating
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={narratorRating === 'unchanged' ? 'unchanged' : narratorRating === 'clear' ? 'clear' : 'set'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'unchanged') setNarratorRating('unchanged');
                  else if (val === 'clear') setNarratorRating('clear');
                  else setNarratorRating(3);
                }}
                className="bg-gray-700 text-white text-sm rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 min-h-[48px]"
              >
                <option value="unchanged">Leave unchanged</option>
                <option value="set">Set rating</option>
                <option value="clear">Clear rating</option>
              </select>
              {narratorRating !== 'unchanged' && narratorRating !== 'clear' && (
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={getRatingValue(narratorRating)}
                    onChange={(r) => setNarratorRating(r === null ? 'clear' : (r as RatingOption))}
                    size="lg"
                  />
                  <span className="text-gray-400 text-sm">{narratorRating}/5</span>
                </div>
              )}
            </div>
          </div>

          {/* Apply Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Apply Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer min-h-[48px]">
                <input
                  type="radio"
                  name="applyMode"
                  value="missingOnly"
                  checked={applyMode === 'missingOnly'}
                  onChange={() => setApplyMode('missingOnly')}
                  className="mt-1 w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-white text-sm font-medium">
                    Apply only to missing fields
                  </span>
                  <p className="text-xs text-netflix-light-gray mt-0.5">
                    Won't overwrite existing ratings (recommended)
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer min-h-[48px] border border-transparent hover:border-orange-500/30">
                <input
                  type="radio"
                  name="applyMode"
                  value="overwrite"
                  checked={applyMode === 'overwrite'}
                  onChange={() => setApplyMode('overwrite')}
                  className="mt-1 w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 focus:ring-orange-500"
                />
                <div>
                  <span className="text-white text-sm font-medium">
                    Overwrite existing
                  </span>
                  <p className="text-xs text-orange-400 mt-0.5">
                    Will replace all existing ratings
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          {hasChanges && (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-sm font-medium text-white mb-2">Preview</h3>
              <p className="text-sm text-netflix-light-gray">
                This will update <span className="text-white font-medium">{preview.totalBooks}</span> books:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-netflix-light-gray">
                {status !== 'unchanged' && (
                  <li>
                    Status changes: <span className="text-white">{preview.statusChanges}</span>
                  </li>
                )}
                {bookRating !== 'unchanged' && (
                  <li>
                    Book rating changes: <span className="text-white">{preview.bookRatingChanges}</span>
                  </li>
                )}
                {narratorRating !== 'unchanged' && (
                  <li>
                    Narrator rating changes: <span className="text-white">{preview.narratorRatingChanges}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 p-4 md:p-6 border-t border-netflix-gray/50 flex gap-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-netflix-gray text-white font-medium rounded-lg min-h-[48px] hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!hasChanges || isApplying}
            className={`
              flex-1 py-3 px-4 font-semibold rounded-lg min-h-[48px] transition-colors
              ${hasChanges && !isApplying
                ? 'bg-netflix-red text-white hover:bg-red-700'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

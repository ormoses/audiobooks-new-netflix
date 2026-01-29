'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number | null;
  onChange?: (rating: number | null) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showClear?: boolean;
}

export default function StarRating({
  rating,
  onChange,
  readonly = false,
  size = 'md',
  showClear = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating ?? rating ?? 0;

  const handleClick = (starIndex: number) => {
    if (readonly || !onChange) return;
    // If clicking the same rating, clear it (if showClear is true)
    if (showClear && rating === starIndex) {
      onChange(null);
    } else {
      onChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (readonly) return;
    setHoverRating(starIndex);
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              transition-transform duration-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded
              disabled:cursor-default
            `}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <svg
              className={`${sizeClasses[size]} ${
                isFilled ? 'text-yellow-400' : 'text-gray-600'
              } transition-colors duration-100`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
      {showClear && !readonly && rating !== null && (
        <button
          type="button"
          onClick={() => onChange?.(null)}
          className="ml-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Clear rating"
        >
          Clear
        </button>
      )}
    </div>
  );
}

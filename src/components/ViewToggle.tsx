'use client';

import { LibraryView } from '@/lib/types';

interface ViewToggleProps {
  view: LibraryView;
  onChange: (view: LibraryView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-netflix-gray p-1">
      <button
        onClick={() => onChange('books')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
          view === 'books'
            ? 'bg-netflix-red text-white'
            : 'text-netflix-light-gray hover:text-white'
        }`}
      >
        Books
      </button>
      <button
        onClick={() => onChange('series')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
          view === 'series'
            ? 'bg-netflix-red text-white'
            : 'text-netflix-light-gray hover:text-white'
        }`}
      >
        Series
      </button>
    </div>
  );
}

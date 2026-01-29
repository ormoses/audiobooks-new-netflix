'use client';

import { useState } from 'react';
import { Book } from '@/lib/types';
import { useToast } from './Toast';
import CopyButton from './CopyButton';

interface BookDetailClientProps {
  book: Book;
}

export default function BookDetailClient({ book }: BookDetailClientProps) {
  const [openingFolder, setOpeningFolder] = useState(false);
  const { showToast } = useToast();

  const handleOpenFolder = async () => {
    setOpeningFolder(true);
    try {
      const response = await fetch('/api/open-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: book.path, type: book.type }),
      });

      const result = await response.json();

      if (result.ok) {
        showToast('Opened in Explorer', 'success');
      } else {
        showToast(result.error || 'Failed to open folder', 'error');
      }
    } catch (error) {
      showToast('Failed to open folder', 'error');
    } finally {
      setOpeningFolder(false);
    }
  };

  const copyText = book.author ? `${book.title} - ${book.author}` : book.title;

  return (
    <div className="flex flex-wrap gap-3">
      <CopyButton text={copyText} label="Copy Title + Author" />

      <button
        onClick={handleOpenFolder}
        disabled={openingFolder}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-netflix-gray hover:bg-netflix-light-gray/20 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {openingFolder ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Opening...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            Open Folder
          </>
        )}
      </button>
    </div>
  );
}

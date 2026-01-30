'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import { CoverExtractResponse } from '@/lib/types';

export default function CoverExtractionSection() {
  const [extracting, setExtracting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<CoverExtractResponse | null>(null);
  const { showToast } = useToast();

  const handleExtract = async () => {
    setExtracting(true);
    setResult(null);

    try {
      const response = await fetch('/api/covers/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwrite }),
      });

      const data: CoverExtractResponse = await response.json();
      setResult(data);

      if (data.ok) {
        if (data.extracted > 0) {
          showToast(
            `Extracted ${data.extracted} cover${data.extracted !== 1 ? 's' : ''}`,
            'success'
          );
        } else if (data.processed === 0) {
          showToast('No books with embedded covers to process', 'info');
        } else {
          showToast('No new covers extracted', 'info');
        }
      } else {
        showToast(data.error || 'Cover extraction failed', 'error');
      }
    } catch (error) {
      console.error('Cover extraction error:', error);
      showToast('Failed to extract covers', 'error');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <section className="bg-netflix-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Cover Extraction</h2>
      <p className="text-netflix-light-gray mb-4">
        Extract embedded cover images from your audiobook files.
        Only books marked as having embedded covers will be processed.
      </p>

      <div className="space-y-4">
        {/* Overwrite checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="w-4 h-4 rounded border-netflix-gray bg-netflix-gray text-netflix-red focus:ring-netflix-red"
          />
          <span className="text-netflix-light-gray text-sm">
            Overwrite existing covers
          </span>
        </label>

        {/* Extract button */}
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="px-4 py-2 bg-netflix-gray hover:bg-netflix-light-gray/20 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {extracting ? 'Extracting...' : 'Extract Covers'}
        </button>

        {/* Result display */}
        {result && result.ok && (
          <div className="p-4 rounded-md bg-green-900/30 border border-green-800">
            <p className="text-green-400 font-medium mb-2">Extraction Complete</p>
            <ul className="text-netflix-light-gray text-sm space-y-0.5">
              <li>Processed: {result.processed} book{result.processed !== 1 ? 's' : ''}</li>
              <li className="text-green-400">Extracted: {result.extracted}</li>
              <li className="text-yellow-400">Skipped: {result.skipped}</li>
              {result.errors > 0 && (
                <li className="text-red-400">Errors: {result.errors}</li>
              )}
            </ul>
          </div>
        )}

        {result && !result.ok && (
          <div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-800 text-sm">
            {result.error || 'Extraction failed'}
          </div>
        )}
      </div>
    </section>
  );
}

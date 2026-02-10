'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-2xl font-semibold text-white mb-3">Something went wrong</h2>
      <p className="text-netflix-light-gray max-w-md mb-6">
        An unexpected error occurred. You can try again or go back to the home page.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded-md transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="px-6 py-3 bg-netflix-gray hover:bg-netflix-light-gray/20 text-white font-semibold rounded-md transition-colors"
        >
          Home
        </a>
      </div>
    </div>
  );
}

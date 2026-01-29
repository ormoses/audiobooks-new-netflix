import PageHeader from '@/components/PageHeader';
import Link from 'next/link';

export default function LibraryPage() {
  return (
    <div>
      <PageHeader
        title="My Library"
        subtitle="Browse your audiobook collection"
      />

      {/* Empty state */}
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
    </div>
  );
}

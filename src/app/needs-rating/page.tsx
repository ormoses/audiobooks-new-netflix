import PageHeader from '@/components/PageHeader';

export default function NeedsRatingPage() {
  return (
    <div>
      <PageHeader
        title="Needs Rating"
        subtitle="Books you've finished that need ratings"
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
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">
          No books need rating
        </h2>
        <p className="text-netflix-light-gray max-w-md">
          When you finish listening to a book and mark it as finished, it will
          appear here if you haven't rated it yet.
        </p>
      </div>
    </div>
  );
}

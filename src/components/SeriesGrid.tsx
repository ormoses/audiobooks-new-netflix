'use client';

import { SeriesStats } from '@/lib/types';
import SeriesCard from './SeriesCard';

interface SeriesGridProps {
  series: SeriesStats[];
  loading?: boolean;
  libraryUrl?: string; // Current library URL to preserve on back navigation
}

export default function SeriesGrid({ series, loading, libraryUrl }: SeriesGridProps) {
  if (loading) {
    // Loading skeleton
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-netflix-gray rounded-md" />
            <div className="mt-2 h-4 bg-netflix-gray rounded w-3/4" />
            <div className="mt-1 h-3 bg-netflix-gray rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-netflix-light-gray">No series found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {series.map(s => (
        <SeriesCard key={s.seriesKey} series={s} libraryUrl={libraryUrl} />
      ))}
    </div>
  );
}

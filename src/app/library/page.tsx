import PageHeader from '@/components/PageHeader';
import LibraryClient from '@/components/LibraryClient';
import { getBooksFiltered } from '@/lib/db';

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  // Fetch initial books on server (default sort)
  const books = await getBooksFiltered();

  return (
    <div>
      <PageHeader
        title="My Library"
        subtitle="Browse your audiobook collection"
      />

      <LibraryClient initialBooks={books} initialTotal={books.length} />
    </div>
  );
}

import PageHeader from '@/components/PageHeader';
import LibraryClient from '@/components/LibraryClient';
import { getBooks } from '@/lib/db';

export default async function LibraryPage() {
  // Fetch initial books on server
  const books = await getBooks();

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

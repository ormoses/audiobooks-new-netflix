import { NextRequest, NextResponse } from 'next/server';
import { getBooks } from '@/lib/db';
import { BooksResponse } from '@/lib/types';

export async function GET(request: NextRequest): Promise<NextResponse<BooksResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const books = await getBooks(search);

    return NextResponse.json({
      ok: true,
      books,
      total: books.length,
    });
  } catch (error) {
    console.error('[API] Error fetching books:', error);
    return NextResponse.json({
      ok: false,
      books: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error fetching books',
    });
  }
}

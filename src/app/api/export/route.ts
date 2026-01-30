import { NextResponse } from 'next/server';
import { getBooksForExport } from '@/lib/db';

export const dynamic = 'force-dynamic';

// UTF-8 BOM for Excel compatibility
const UTF8_BOM = '\uFEFF';

// Escape CSV field (handle quotes, commas, newlines)
function escapeCSVField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Format narrator ratings as JSON string
function formatNarratorRatingsJSON(ratings: Record<string, number | null>): string {
  const entries = Object.entries(ratings).filter(([, v]) => v !== null);
  if (entries.length === 0) return '';
  const obj: Record<string, number> = {};
  for (const [name, rating] of entries) {
    if (rating !== null) obj[name] = rating;
  }
  return JSON.stringify(obj);
}

// Format narrator ratings as text: "Narrator1: 5, Narrator2: 4"
function formatNarratorRatingsText(ratings: Record<string, number | null>): string {
  const entries = Object.entries(ratings).filter(([, v]) => v !== null);
  if (entries.length === 0) return '';
  return entries.map(([name, rating]) => `${name}: ${rating}`).join(', ');
}

export async function GET(): Promise<NextResponse> {
  try {
    const books = await getBooksForExport();

    // CSV header row
    const headers = [
      'Path',
      'Type',
      'Title',
      'Author',
      'Narrator',
      'Duration_Seconds',
      'Has_Embedded_Cover',
      'Total_Size_Bytes',
      'File_Count',
      'Is_Duplicate',
      'Series_Name',
      'Series_Exact_Name',
      'Book_Number',
      'Series_Ended',
      'Status',
      'Book_Rating',
      'Tags',
      'Notes',
      'Narrator_Ratings_JSON',
      'Narrator_Ratings_Text',
      'Cover_Image_Path',
      'Missing_From_CSV',
      'Source',
      'Date_Added',
      'Date_Updated',
    ];

    // Build CSV rows with CRLF line endings
    const rows: string[] = [];
    rows.push(headers.join(','));

    for (const book of books) {
      const row = [
        escapeCSVField(book.path),
        escapeCSVField(book.type),
        escapeCSVField(book.title),
        escapeCSVField(book.author),
        escapeCSVField(book.narrator),
        escapeCSVField(book.duration_seconds),
        escapeCSVField(book.has_embedded_cover === null ? '' : book.has_embedded_cover ? 'TRUE' : 'FALSE'),
        escapeCSVField(book.total_size_bytes),
        escapeCSVField(book.file_count),
        escapeCSVField(book.is_duplicate === null ? '' : book.is_duplicate ? 'TRUE' : 'FALSE'),
        escapeCSVField(book.series),
        escapeCSVField(book.series_exact_name_raw),
        escapeCSVField(book.series_book_number),
        escapeCSVField(book.series_ended === null ? '' : book.series_ended ? 'TRUE' : 'FALSE'),
        escapeCSVField(book.status),
        escapeCSVField(book.book_rating),
        escapeCSVField(book.tags),
        escapeCSVField(book.notes),
        escapeCSVField(formatNarratorRatingsJSON(book.narratorRatings)),
        escapeCSVField(formatNarratorRatingsText(book.narratorRatings)),
        escapeCSVField(book.cover_image_path),
        escapeCSVField(book.missing_from_csv ? 'TRUE' : 'FALSE'),
        escapeCSVField(book.source),
        escapeCSVField(book.date_added),
        escapeCSVField(book.date_updated),
      ];
      rows.push(row.join(','));
    }

    // Join with CRLF for Windows/Excel compatibility
    const csvContent = UTF8_BOM + rows.join('\r\n');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `audiobook_export_${date}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[API] Export error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

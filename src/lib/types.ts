// TypeScript type definitions for the audiobook catalog

// Book type stored in database
export interface Book {
  id: number;
  path: string;
  type: 'Folder' | 'SingleFile';
  title: string;
  author: string | null;
  narrator: string | null;
  duration_seconds: number | null;
  has_embedded_cover: boolean | null;
  total_size_bytes: number | null;
  file_count: number | null;
  is_duplicate: boolean | null;
  series: string | null;
  series_book_number: string | null;
  series_ended: boolean | null;
  series_name_raw: string | null;
  series_exact_name_raw: string | null;
  source: string;
  date_added: string;
  date_updated: string;
}

// Book for grid display (subset of fields)
export interface BookSummary {
  id: number;
  title: string;
  author: string | null;
  series: string | null;
  series_book_number: string | null;
  duration_seconds: number | null;
  is_duplicate: boolean | null;
}

// CSV row from audiobook_index_series_verified.csv
export interface CsvRow {
  Path: string;
  Type: string;
  Title: string;
  Author?: string;
  Duration_Seconds?: string;
  Has_Embedded_Cover?: string;
  Total_Size_Bytes?: string;
  File_Count?: string;
  Is_Duplicate?: string;
  Series_Name?: string;
  Series_Exact_Name?: string;
  Book_Number?: string;
  Series_Ended?: string;
  Narrator?: string;
}

// Import summary returned after CSV import
export interface ImportSummary {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

// API response types
export interface ValidateResponse {
  ok: boolean;
  error?: string;
}

export interface ImportResponse {
  ok: boolean;
  summary?: ImportSummary;
  error?: string;
}

export interface BooksResponse {
  ok: boolean;
  books: BookSummary[];
  total: number;
  error?: string;
}

export interface BookDetailResponse {
  ok: boolean;
  book?: Book;
  error?: string;
}

export interface OpenPathResponse {
  ok: boolean;
  error?: string;
}

// App metadata keys
export type AppMetaKey = 'schema_version' | 'last_import_at' | 'last_csv_path';

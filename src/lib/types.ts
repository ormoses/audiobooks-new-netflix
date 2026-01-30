// TypeScript type definitions for the audiobook catalog

// Status type - matches database CHECK constraint
export type BookStatus = 'not_started' | 'in_progress' | 'finished';

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
  // User fields (Step 3)
  status: BookStatus;
  book_rating: number | null;
  tags: string | null;
  notes: string | null;
  // Step 5 fields
  cover_image_path: string | null;
  missing_from_csv: boolean;
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
  // User fields for display
  status: BookStatus;
  book_rating: number | null;
  // Step 5 fields
  cover_image_path: string | null;
  missing_from_csv: boolean;
}

// Narrator rating record
export interface NarratorRating {
  narratorName: string;
  rating: number | null;
}

// Book with narrator ratings for detail/needs-rating views
export interface BookWithRatings extends Book {
  narrators: string[];
  narratorRatings: Record<string, number | null>;
}

// Book for needs-rating display
export interface NeedsRatingBook {
  id: number;
  title: string;
  author: string | null;
  series: string | null;
  series_book_number: string | null;
  duration_seconds: number | null;
  narrator: string | null;
  book_rating: number | null;
  narrators: string[];
  narratorRatings: Record<string, number | null>;
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
  markedMissing: number; // Books in DB but not in CSV (Step 5)
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
  book?: BookWithRatings;
  error?: string;
}

export interface OpenPathResponse {
  ok: boolean;
  error?: string;
}

// Book update request
export interface BookUpdateRequest {
  status?: BookStatus;
  book_rating?: number | null;
  notes?: string | null;
  tags?: string | null;
}

// Book update response
export interface BookUpdateResponse {
  ok: boolean;
  book?: Book;
  error?: string;
}

// Narrator ratings update request
export interface NarratorRatingsRequest {
  ratings: NarratorRating[];
}

// Narrator ratings update response
export interface NarratorRatingsResponse {
  ok: boolean;
  error?: string;
}

// Needs rating response
export interface NeedsRatingResponse {
  ok: boolean;
  books: NeedsRatingBook[];
  error?: string;
}

// App metadata keys
export type AppMetaKey = 'schema_version' | 'last_import_at' | 'last_csv_path';

// ============ Step 4: Series + Filters + Sorting ============

// Library view mode
export type LibraryView = 'books' | 'series';

// Rating filter options for Books
export type RatingFilter = 'all' | 'fullyRated' | 'unrated';

// Rating filter options for Series (includes partlyRated)
export type SeriesRatingFilter = 'all' | 'fullyRated' | 'partlyRated' | 'unrated';

// Book sort fields (whitelist)
export type BookSortField =
  | 'title'
  | 'author'
  | 'narrator'
  | 'book_rating'
  | 'date_added'
  | 'status'
  | 'series'
  | 'series_book_number';

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Book filter options
export interface BookFilters {
  search?: string;
  statuses?: BookStatus[];
  ratingFilter?: RatingFilter;
  seriesKey?: string; // encoded series name or 'standalone'
}

// Book sort options
export interface BookSort {
  field: BookSortField;
  direction: SortDirection;
}

// Series sort fields
export type SeriesSortField =
  | 'seriesName'
  | 'bookCount'
  | 'totalDurationSeconds'
  | 'avgBookRating'
  | 'completionPercent';

// Series filter options
export interface SeriesFilters {
  search?: string; // search series name, book titles, authors, narrators
  ratingFilter?: SeriesRatingFilter; // all, fullyRated, partlyRated, unrated
  completionStatus?: BookStatus; // not_started, in_progress, finished
}

// Series sort options
export interface SeriesSort {
  field: SeriesSortField;
  direction: SortDirection;
}

// Series completion status
export type SeriesCompletionStatus = 'not_started' | 'in_progress' | 'finished';

// Series stats for grid display
export interface SeriesStats {
  seriesKey: string; // URL-safe key (encoded series name or 'standalone')
  seriesName: string; // Display name
  bookCount: number;
  totalDurationSeconds: number;
  finishedCount: number;
  notStartedCount: number;
  inProgressCount: number;
  avgBookRating: number | null; // Average of non-null book_ratings
  ratedCount: number; // Books with book_rating
  unratedCount: number; // Books not fully rated
  completionStatus: SeriesCompletionStatus;
  completionPercent: number; // finishedCount / bookCount * 100
  coverBookId: number | null; // Book ID to use for series cover
  coverUpdatedAt: string | null; // For cache-busting
}

// Extended book summary with narrator info for filtering
export interface BookSummaryWithNarrators extends BookSummary {
  narrator: string | null;
  narrators: string[];
  narratorRatings: Record<string, number | null>;
  date_added: string;
  date_updated: string;
  // Note: cover_image_path and missing_from_csv inherited from BookSummary
}

// Series response
export interface SeriesResponse {
  ok: boolean;
  series: SeriesStats[];
  error?: string;
}

// Books response with narrator info
export interface BooksWithNarratorsResponse {
  ok: boolean;
  books: BookSummaryWithNarrators[];
  total: number;
  error?: string;
}

// ============ Step 5: Export + Covers ============

// Cover extraction request
export interface CoverExtractRequest {
  bookIds?: number[];
  overwrite?: boolean;
}

// Cover extraction response
export interface CoverExtractResponse {
  ok: boolean;
  processed: number;
  extracted: number;
  skipped: number;
  errors: number;
  error?: string;
}

// Export response (streaming CSV, no JSON needed)
export interface ExportInfo {
  totalBooks: number;
  exportedAt: string;
}

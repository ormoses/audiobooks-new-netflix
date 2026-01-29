// CSV parsing utilities - SERVER ONLY
import 'server-only';
import Papa from 'papaparse';
import fs from 'fs';
import { CsvRow } from './types';
import {
  normalizePath,
  parseCsvBoolean,
  parseCsvInt,
  parseCsvString,
} from './utils';

// Required columns that must be present in CSV
const REQUIRED_COLUMNS = ['Path', 'Type', 'Title'];

// All expected columns
const EXPECTED_COLUMNS = [
  'Path',
  'Type',
  'Title',
  'Author',
  'Duration_Seconds',
  'Has_Embedded_Cover',
  'Total_Size_Bytes',
  'File_Count',
  'Is_Duplicate',
  'Series_Name',
  'Series_Exact_Name',
  'Book_Number',
  'Series_Ended',
  'Narrator',
];

export interface ParsedBook {
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
}

export interface CsvParseResult {
  success: boolean;
  books: ParsedBook[];
  totalRows: number;
  skippedRows: number;
  parseErrors: number;
  error?: string;
}

/**
 * Validate that a CSV file exists and has .csv extension
 */
export function validateCsvPath(filePath: string): { valid: boolean; error?: string } {
  if (!filePath || filePath.trim() === '') {
    return { valid: false, error: 'CSV path is required' };
  }

  const normalizedPath = normalizePath(filePath);

  if (!normalizedPath.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: 'File must have .csv extension' };
  }

  if (!fs.existsSync(normalizedPath)) {
    return { valid: false, error: 'File not found at specified path' };
  }

  try {
    fs.accessSync(normalizedPath, fs.constants.R_OK);
  } catch {
    return { valid: false, error: 'File is not readable' };
  }

  return { valid: true };
}

/**
 * Parse a CSV file and return parsed book data
 */
export async function parseCsvFile(filePath: string): Promise<CsvParseResult> {
  const validation = validateCsvPath(filePath);
  if (!validation.valid) {
    return {
      success: false,
      books: [],
      totalRows: 0,
      skippedRows: 0,
      parseErrors: 0,
      error: validation.error,
    };
  }

  const normalizedPath = normalizePath(filePath);

  return new Promise((resolve) => {
    const books: ParsedBook[] = [];
    let totalRows = 0;
    let skippedRows = 0;
    let parseErrors = 0;
    let headerValidated = false;

    const fileContent = fs.readFileSync(normalizedPath, 'utf-8');

    Papa.parse<CsvRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        // Validate headers
        if (results.meta.fields) {
          const missingColumns = REQUIRED_COLUMNS.filter(
            (col) => !results.meta.fields!.includes(col)
          );
          if (missingColumns.length > 0) {
            resolve({
              success: false,
              books: [],
              totalRows: 0,
              skippedRows: 0,
              parseErrors: 0,
              error: `Missing required columns: ${missingColumns.join(', ')}`,
            });
            return;
          }
          headerValidated = true;
        }

        if (!headerValidated) {
          resolve({
            success: false,
            books: [],
            totalRows: 0,
            skippedRows: 0,
            parseErrors: 0,
            error: 'Could not parse CSV headers',
          });
          return;
        }

        // Process rows
        for (const row of results.data) {
          totalRows++;

          // Validate required fields
          if (!row.Path || !row.Type || !row.Title) {
            skippedRows++;
            continue;
          }

          // Validate Type
          const type = row.Type.trim();
          if (type !== 'Folder' && type !== 'SingleFile') {
            skippedRows++;
            continue;
          }

          // Parse and normalize data
          const path = normalizePath(row.Path);
          if (!path) {
            skippedRows++;
            continue;
          }

          // Derive series from Series_Exact_Name or Series_Name
          const seriesExactName = parseCsvString(row.Series_Exact_Name);
          const seriesName = parseCsvString(row.Series_Name);
          const series = seriesExactName || seriesName;

          const book: ParsedBook = {
            path,
            type: type as 'Folder' | 'SingleFile',
            title: row.Title.trim(),
            author: parseCsvString(row.Author),
            narrator: parseCsvString(row.Narrator),
            duration_seconds: parseCsvInt(row.Duration_Seconds),
            has_embedded_cover: parseCsvBoolean(row.Has_Embedded_Cover),
            total_size_bytes: parseCsvInt(row.Total_Size_Bytes),
            file_count: parseCsvInt(row.File_Count),
            is_duplicate: parseCsvBoolean(row.Is_Duplicate),
            series,
            series_book_number: parseCsvString(row.Book_Number),
            series_ended: parseCsvBoolean(row.Series_Ended),
            series_name_raw: seriesName,
            series_exact_name_raw: seriesExactName,
          };

          books.push(book);
        }

        // Count parse errors from PapaParse
        parseErrors = results.errors.length;

        resolve({
          success: true,
          books,
          totalRows,
          skippedRows,
          parseErrors,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          books: [],
          totalRows: 0,
          skippedRows: 0,
          parseErrors: 1,
          error: `CSV parse error: ${error.message}`,
        });
      },
    });
  });
}

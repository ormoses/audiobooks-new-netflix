import { NextRequest, NextResponse } from 'next/server';
import { upsertScannedBook, setBookCoverPath, setBookCoverUrl } from '@/lib/db';
import { FileCommitRequest, FileCommitResponse, FileCommitItemResult, ReviewedBookCandidate } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { isProduction } from '@/lib/env';
import { put } from '@vercel/blob';
import * as mm from 'music-metadata';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Supported audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.m4b', '.flac', '.ogg', '.opus', '.wma', '.aac'];

// Get covers directory path
function getCoversDir(): string {
  return path.resolve(process.cwd(), './data/covers');
}

// Ensure covers directory exists
function ensureCoversDir(): void {
  const dir = getCoversDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Find first audio file in a path (file or directory)
function findFirstAudioFile(bookPath: string, bookType: string): string | null {
  try {
    if (!fs.existsSync(bookPath)) return null;

    const stat = fs.statSync(bookPath);

    // If it's a file (SingleFile type), check if it's audio
    if (stat.isFile() || bookType === 'SingleFile') {
      const ext = path.extname(bookPath).toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext)) {
        return bookPath;
      }
      return null;
    }

    // If it's a directory, search for audio files
    const files = fs.readdirSync(bookPath);
    files.sort();

    // Prefer .m4b files
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.m4b') {
        return path.join(bookPath, file);
      }
    }

    // Fallback to any audio file
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext)) {
        return path.join(bookPath, file);
      }
    }

    return null;
  } catch (error) {
    console.error(`[Commit] Error finding audio file in ${bookPath}:`, error);
    return null;
  }
}

// Extract cover from audio file and save as JPEG
async function extractCoverForBook(bookId: number, bookPath: string, bookType: string): Promise<boolean> {
  try {
    const audioFilePath = findFirstAudioFile(bookPath, bookType);

    if (!audioFilePath || !fs.existsSync(audioFilePath)) {
      console.log(`[Commit] No audio file found for book ${bookId}`);
      return false;
    }

    const metadata = await mm.parseFile(audioFilePath);
    const pictures = metadata.common.picture;

    if (!pictures || pictures.length === 0) {
      console.log(`[Commit] No embedded cover in ${audioFilePath}`);
      return false;
    }

    const picture = pictures[0];
    const coversDir = getCoversDir();
    const coverPath = path.join(coversDir, `${bookId}.jpg`);

    await sharp(picture.data)
      .resize(600, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toFile(coverPath);

    await setBookCoverPath(bookId, `covers/${bookId}.jpg`);

    console.log(`[Commit] Extracted cover for book ${bookId}`);
    return true;
  } catch (error) {
    console.error(`[Commit] Error extracting cover for book ${bookId}:`, error);
    return false;
  }
}

// Upload local cover to Vercel Blob
async function uploadCoverToBlob(bookId: number, blobToken: string): Promise<string | null> {
  try {
    const coversDir = getCoversDir();
    const localCoverPath = path.join(coversDir, `${bookId}.jpg`);

    if (!fs.existsSync(localCoverPath)) {
      console.log(`[Commit] No local cover to upload for book ${bookId}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(localCoverPath);

    const blob = await put(`covers/${bookId}.jpg`, fileBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
      token: blobToken,
    });

    await setBookCoverUrl(bookId, blob.url);

    console.log(`[Commit] Uploaded cover for book ${bookId} to ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error(`[Commit] Error uploading cover for book ${bookId}:`, error);
    return null;
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<FileCommitResponse> | Response> {
  // Block in production - this is a local-only feature
  if (isProduction()) {
    return NextResponse.json({
      ok: false,
      error: 'File import is only available in local mode',
    }, { status: 403 });
  }

  // Require authentication
  const authResult = await requireAuth();
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body: FileCommitRequest = await request.json();

    if (!body.books || !Array.isArray(body.books)) {
      return NextResponse.json({
        ok: false,
        error: 'books array is required',
      }, { status: 400 });
    }

    if (body.books.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'No books to import',
      }, { status: 400 });
    }

    // Check for multi-.m4b folders without user decision
    const pendingDecisions = body.books.filter(
      b => b.multipleM4bFiles && !b.userDecision
    );
    if (pendingDecisions.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `${pendingDecisions.length} folder(s) with multiple .m4b files require a user decision before import`,
      }, { status: 400 });
    }

    // Ensure covers directory exists
    ensureCoversDir();

    // Get Vercel Blob token (optional - upload will be skipped if not available)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    const results: FileCommitItemResult[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let coversExtracted = 0;
    let coversUploaded = 0;

    for (const book of body.books) {
      const result: FileCommitItemResult = {
        path: book.path,
        status: 'skipped',
      };

      try {
        // Handle multi-.m4b "multiple" decision - split into individual files
        if (book.multipleM4bFiles && book.userDecision === 'multiple' && book.m4bFilePaths) {
          // Import each .m4b file as a separate book
          for (const m4bPath of book.m4bFilePaths) {
            const fileName = path.basename(m4bPath, path.extname(m4bPath));
            const stats = fs.statSync(m4bPath);

            const subResult = await upsertScannedBook({
              path: m4bPath,
              type: 'SingleFile',
              title: fileName, // Will be refined from metadata if available
              author: book.author,
              narrator: book.narrator,
              series: book.series,
              seriesBookNumber: book.seriesBookNumber,
              durationSeconds: null, // Will be set from metadata
              totalSizeBytes: stats.size,
              fileCount: 1,
              hasEmbeddedCover: book.hasEmbeddedCover,
            });

            if (subResult.status === 'inserted') inserted++;
            else if (subResult.status === 'updated') updated++;

            // Extract and upload cover for this sub-book
            if (book.hasEmbeddedCover) {
              const coverExtracted = await extractCoverForBook(subResult.bookId, m4bPath, 'SingleFile');
              if (coverExtracted) {
                coversExtracted++;
                if (blobToken) {
                  const coverUrl = await uploadCoverToBlob(subResult.bookId, blobToken);
                  if (coverUrl) coversUploaded++;
                }
              }
            }
          }

          result.status = 'inserted';
          results.push(result);
          continue;
        }

        // Standard import (single book or multi-.m4b treated as one)
        const upsertResult = await upsertScannedBook({
          path: book.path,
          type: book.type,
          title: book.title,
          author: book.author,
          narrator: book.narrator,
          series: book.series,
          seriesBookNumber: book.seriesBookNumber,
          durationSeconds: book.durationSeconds,
          totalSizeBytes: book.totalSizeBytes,
          fileCount: book.fileCount,
          hasEmbeddedCover: book.hasEmbeddedCover,
        });

        result.bookId = upsertResult.bookId;
        result.status = upsertResult.status;

        if (upsertResult.status === 'inserted') inserted++;
        else if (upsertResult.status === 'updated') updated++;

        // Extract cover if available
        if (book.hasEmbeddedCover) {
          const coverExtracted = await extractCoverForBook(
            upsertResult.bookId,
            book.path,
            book.type
          );
          result.coverExtracted = coverExtracted;
          if (coverExtracted) {
            coversExtracted++;

            // Upload to Vercel Blob if token available
            if (blobToken) {
              const coverUrl = await uploadCoverToBlob(upsertResult.bookId, blobToken);
              result.coverUploaded = !!coverUrl;
              if (coverUrl) coversUploaded++;
            }
          }
        }

        results.push(result);
      } catch (error) {
        console.error(`[Commit] Error processing book ${book.path}:`, error);
        result.status = 'error';
        result.error = error instanceof Error ? error.message : 'Unknown error';
        results.push(result);
        errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total: body.books.length,
        inserted,
        updated,
        skipped,
        errors,
        coversExtracted,
        coversUploaded,
      },
      results,
    });
  } catch (error) {
    console.error('[API] Error committing files:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error committing files',
    }, { status: 500 });
  }
}

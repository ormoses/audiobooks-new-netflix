import { NextRequest, NextResponse } from 'next/server';
import { getBooksForCoverUpload, setBookCoverUrl } from '@/lib/db';
import { CoverUploadRequest, CoverUploadResponse } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { isDeployedCloud } from '@/lib/env';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Get covers directory path
function getCoversDir(): string {
  return path.resolve(process.cwd(), './data/covers');
}

export async function POST(request: NextRequest): Promise<NextResponse<CoverUploadResponse> | Response> {
  // Require authentication for mutations
  const authResult = await requireAuth();
  if (authResult instanceof Response) {
    return authResult;
  }

  // Check if we have Vercel Blob token
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json({
      ok: false,
      processed: 0,
      uploaded: 0,
      skipped: 0,
      errors: 0,
      error: 'BLOB_READ_WRITE_TOKEN not configured. Add it to your environment variables.',
    }, { status: 500 });
  }

  try {
    const body: CoverUploadRequest = await request.json();
    const { bookIds } = body;

    // Get books that need cover upload
    const books = await getBooksForCoverUpload(bookIds);

    if (books.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        uploaded: 0,
        skipped: 0,
        errors: 0,
      });
    }

    const coversDir = getCoversDir();
    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const book of books) {
      try {
        // Build absolute path to local cover
        const localCoverPath = path.join(coversDir, path.basename(book.cover_image_path));

        // On Vercel, we can't read local files, so skip
        if (isDeployedCloud()) {
          console.log(`[Covers] Skipping book ${book.id} - running on Vercel, no local filesystem`);
          skipped++;
          continue;
        }

        // Check if local file exists
        if (!fs.existsSync(localCoverPath)) {
          console.log(`[Covers] Local cover not found for book ${book.id}: ${localCoverPath}`);
          skipped++;
          continue;
        }

        // Read local file
        const fileBuffer = fs.readFileSync(localCoverPath);

        // Upload to Vercel Blob
        const blob = await put(`covers/${book.id}.jpg`, fileBuffer, {
          access: 'public',
          contentType: 'image/jpeg',
          token: blobToken,
        });

        // Update database with blob URL
        await setBookCoverUrl(book.id, blob.url);

        console.log(`[Covers] Uploaded cover for book ${book.id} to ${blob.url}`);
        uploaded++;
      } catch (error) {
        console.error(`[Covers] Error uploading cover for book ${book.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: books.length,
      uploaded,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('[API] Cover upload error:', error);
    return NextResponse.json({
      ok: false,
      processed: 0,
      uploaded: 0,
      skipped: 0,
      errors: 1,
      error: error instanceof Error ? error.message : 'Cover upload failed',
    });
  }
}

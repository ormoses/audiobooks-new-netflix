import { NextRequest, NextResponse } from 'next/server';
import { getBooksForCoverExtraction, setBookCoverPath } from '@/lib/db';
import { CoverExtractRequest, CoverExtractResponse } from '@/lib/types';
import * as mm from 'music-metadata';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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

// Find first audio file in a directory
function findFirstAudioFile(dirPath: string): string | null {
  try {
    if (!fs.existsSync(dirPath)) return null;

    const stat = fs.statSync(dirPath);

    // If it's a file (SingleFile type), check if it's audio
    if (stat.isFile()) {
      const ext = path.extname(dirPath).toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext)) {
        return dirPath;
      }
      return null;
    }

    // If it's a directory, search for audio files
    const files = fs.readdirSync(dirPath);

    // Sort files to get consistent order
    files.sort();

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext)) {
        return path.join(dirPath, file);
      }
    }

    // Check subdirectories (one level deep)
    for (const file of files) {
      const subPath = path.join(dirPath, file);
      const subStat = fs.statSync(subPath);
      if (subStat.isDirectory()) {
        const subFiles = fs.readdirSync(subPath);
        subFiles.sort();
        for (const subFile of subFiles) {
          const ext = path.extname(subFile).toLowerCase();
          if (AUDIO_EXTENSIONS.includes(ext)) {
            return path.join(subPath, subFile);
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`[Covers] Error finding audio file in ${dirPath}:`, error);
    return null;
  }
}

// Extract cover from audio file and save as JPEG
async function extractCover(
  bookId: number,
  bookPath: string,
  bookType: string
): Promise<boolean> {
  try {
    // Find audio file
    const audioFilePath = bookType === 'SingleFile' ? bookPath : findFirstAudioFile(bookPath);

    if (!audioFilePath || !fs.existsSync(audioFilePath)) {
      console.log(`[Covers] No audio file found for book ${bookId}`);
      return false;
    }

    // Parse metadata
    const metadata = await mm.parseFile(audioFilePath);
    const pictures = metadata.common.picture;

    if (!pictures || pictures.length === 0) {
      console.log(`[Covers] No embedded cover in ${audioFilePath}`);
      return false;
    }

    // Use first picture (usually the front cover)
    const picture = pictures[0];

    // Process image with sharp: resize and convert to JPEG
    const coversDir = getCoversDir();
    const coverPath = path.join(coversDir, `${bookId}.jpg`);

    await sharp(picture.data)
      .resize(600, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toFile(coverPath);

    // Update database with relative path
    await setBookCoverPath(bookId, `covers/${bookId}.jpg`);

    console.log(`[Covers] Extracted cover for book ${bookId}`);
    return true;
  } catch (error) {
    console.error(`[Covers] Error extracting cover for book ${bookId}:`, error);
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<CoverExtractResponse>> {
  try {
    const body: CoverExtractRequest = await request.json();
    const { bookIds, overwrite } = body;

    // Ensure covers directory exists
    ensureCoversDir();

    // Get books to process
    const books = await getBooksForCoverExtraction(bookIds, overwrite);

    if (books.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        extracted: 0,
        skipped: 0,
        errors: 0,
      });
    }

    let extracted = 0;
    let skipped = 0;
    let errors = 0;

    for (const book of books) {
      try {
        // Skip if already has cover and not overwriting
        if (book.cover_image_path && !overwrite) {
          skipped++;
          continue;
        }

        const success = await extractCover(book.id, book.path, book.type);
        if (success) {
          extracted++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`[Covers] Error processing book ${book.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: books.length,
      extracted,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('[API] Cover extraction error:', error);
    return NextResponse.json({
      ok: false,
      processed: 0,
      extracted: 0,
      skipped: 0,
      errors: 1,
      error: error instanceof Error ? error.message : 'Cover extraction failed',
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getBookCoverPath, getBookCoverUrl } from '@/lib/db';
import { isDeployedCloud } from '@/lib/env';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const bookId = parseInt(id, 10);

    if (isNaN(bookId)) {
      return new NextResponse('Invalid book ID', { status: 400 });
    }

    // First check for cloud URL (works on Vercel and local)
    const coverUrl = await getBookCoverUrl(bookId);
    if (coverUrl) {
      // Redirect to Vercel Blob URL
      return NextResponse.redirect(coverUrl, {
        status: 302,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // On Vercel without cloud URL, no cover available
    if (isDeployedCloud()) {
      return new NextResponse('No cloud cover available', { status: 404 });
    }

    // Local mode: try to serve from filesystem
    const coverPath = await getBookCoverPath(bookId);

    if (!coverPath) {
      return new NextResponse('No cover found', { status: 404 });
    }

    // Build absolute path
    const absolutePath = path.resolve(process.cwd(), './data', coverPath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return new NextResponse('Cover file not found', { status: 404 });
    }

    // Read file and return
    const fileBuffer = fs.readFileSync(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[API] Cover serving error:', error);
    return new NextResponse('Error serving cover', { status: 500 });
  }
}

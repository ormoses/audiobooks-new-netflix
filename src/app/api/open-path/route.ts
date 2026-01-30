import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { OpenPathResponse } from '@/lib/types';
import { isProduction } from '@/lib/env';

const execAsync = promisify(exec);

export async function POST(request: NextRequest): Promise<NextResponse<OpenPathResponse>> {
  // Block in production - only makes sense for local development
  if (isProduction()) {
    return NextResponse.json({
      ok: false,
      error: 'Open folder is not available in production',
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { path, type } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'Path is required',
      });
    }

    if (!type || (type !== 'Folder' && type !== 'SingleFile')) {
      return NextResponse.json({
        ok: false,
        error: 'Type must be "Folder" or "SingleFile"',
      });
    }

    // Check if path exists
    if (!fs.existsSync(path)) {
      return NextResponse.json({
        ok: false,
        error: 'Path does not exist on the filesystem',
      });
    }

    // Build the explorer command
    let command: string;

    if (type === 'Folder') {
      // Open folder directly
      command = `explorer.exe "${path}"`;
    } else {
      // Open Explorer and select the file
      command = `explorer.exe /select,"${path}"`;
    }

    try {
      await execAsync(command);
      return NextResponse.json({ ok: true });
    } catch (execError) {
      // explorer.exe returns exit code 1 even on success sometimes
      // Check if the error is just an exit code issue
      const error = execError as { code?: number; stderr?: string };
      if (error.code === 1 && !error.stderr) {
        // This is likely a success case
        return NextResponse.json({ ok: true });
      }
      throw execError;
    }
  } catch (error) {
    console.error('[API] Error opening path:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to open path',
    });
  }
}

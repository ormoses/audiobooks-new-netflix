import { NextResponse } from 'next/server';
import { checkDatabaseHealth, getBookCount } from '@/lib/db';

export async function GET() {
  const dbHealth = checkDatabaseHealth();

  if (!dbHealth.ok) {
    return NextResponse.json(
      {
        ok: false,
        db: 'error',
        error: dbHealth.error,
      },
      { status: 500 }
    );
  }

  const bookCount = getBookCount();

  return NextResponse.json({
    ok: true,
    db: 'connected',
    bookCount,
    timestamp: new Date().toISOString(),
  });
}

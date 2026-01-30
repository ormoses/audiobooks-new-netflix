import { NextResponse } from 'next/server';
import { checkDatabaseHealth, getBookCount } from '@/lib/db';
import { isProduction } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.ok) {
    return NextResponse.json(
      {
        ok: false,
        db: 'error',
        error: dbHealth.error,
        mode: isProduction() ? 'production' : 'development',
      },
      { status: 500 }
    );
  }

  const bookCount = await getBookCount();

  return NextResponse.json({
    ok: true,
    db: 'connected',
    dbMode: dbHealth.mode,
    bookCount,
    appMode: isProduction() ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
}

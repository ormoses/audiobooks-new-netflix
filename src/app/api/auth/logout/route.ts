import { NextResponse } from 'next/server';
import { getClearCookieHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface LogoutResponse {
  ok: boolean;
}

export async function POST(): Promise<NextResponse<LogoutResponse>> {
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', getClearCookieHeader());
  return response;
}

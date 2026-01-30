import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AuthStatusResponse {
  authenticated: boolean;
}

export async function GET(): Promise<NextResponse<AuthStatusResponse>> {
  const auth = await verifyAuth();
  return NextResponse.json({
    authenticated: auth.authenticated,
  });
}

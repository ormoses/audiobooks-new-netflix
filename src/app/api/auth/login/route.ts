import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, getAuthCookieHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface LoginRequest {
  password: string;
}

interface LoginResponse {
  ok: boolean;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'Password is required',
      }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid password',
      }, { status: 401 });
    }

    // Create response with auth cookie
    const response = NextResponse.json({ ok: true });
    response.headers.set('Set-Cookie', getAuthCookieHeader());

    return response;
  } catch (error) {
    console.error('[API] Login error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Login failed',
    }, { status: 500 });
  }
}

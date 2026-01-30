// Authentication utilities - SERVER ONLY
import 'server-only';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

interface AuthPayload {
  authenticated: boolean;
  exp: number;
}

interface AuthResult {
  authenticated: boolean;
  error?: string;
}

/**
 * Get the AUTH_SECRET from environment, throw if missing
 */
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Get the APP_PASSWORD from environment
 */
function getAppPassword(): string | null {
  return process.env.APP_PASSWORD || null;
}

/**
 * Create HMAC signature for a payload
 */
function createSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Verify HMAC signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createSignature(payload, secret);
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Create a signed auth token
 */
export function createAuthToken(): string {
  const secret = getAuthSecret();
  const payload: AuthPayload = {
    authenticated: true,
    exp: Date.now() + COOKIE_MAX_AGE * 1000,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createSignature(payloadStr, secret);
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an auth token
 */
function verifyAuthToken(token: string): AuthResult {
  try {
    const secret = getAuthSecret();
    const [payloadStr, signature] = token.split('.');

    if (!payloadStr || !signature) {
      return { authenticated: false, error: 'Invalid token format' };
    }

    if (!verifySignature(payloadStr, signature, secret)) {
      return { authenticated: false, error: 'Invalid signature' };
    }

    const payload: AuthPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString()
    );

    if (payload.exp < Date.now()) {
      return { authenticated: false, error: 'Token expired' };
    }

    return { authenticated: payload.authenticated };
  } catch {
    return { authenticated: false, error: 'Token verification failed' };
  }
}

/**
 * Verify password against APP_PASSWORD
 */
export function verifyPassword(password: string): boolean {
  const appPassword = getAppPassword();
  if (!appPassword) {
    console.error('[Auth] APP_PASSWORD not configured');
    return false;
  }
  return password === appPassword;
}

/**
 * Check if the current request is authenticated via cookie
 */
export async function verifyAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return { authenticated: false, error: 'No auth token' };
    }

    return verifyAuthToken(token);
  } catch {
    return { authenticated: false, error: 'Auth check failed' };
  }
}

/**
 * Require authentication - returns 401 response if not authenticated
 * Use this in mutation API routes
 */
export async function requireAuth(): Promise<{ authenticated: true } | Response> {
  const auth = await verifyAuth();

  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return { authenticated: true };
}

/**
 * Set the auth cookie after successful login
 */
export async function setAuthCookie(): Promise<void> {
  const token = createAuthToken();
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear the auth cookie (logout)
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get cookie configuration for Response headers (for login endpoint)
 */
export function getAuthCookieHeader(): string {
  const token = createAuthToken();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Path=/${secure}`;
}

/**
 * Get clear cookie header for logout
 */
export function getClearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
}

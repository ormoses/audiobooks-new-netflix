// Environment detection utilities

/**
 * Check if running on Vercel (production deployment)
 * This is the strict check for "are we on Vercel cloud?"
 */
export function isVercel(): boolean {
  return process.env.VERCEL === '1';
}

/**
 * Check if running in production environment
 * Used for feature flags like hiding import UI
 */
export function isProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

/**
 * Check if running in deployed cloud mode (actually on Vercel, not just local prod build)
 * This is used for hard-enforced restrictions like requiring Turso
 */
export function isDeployedCloud(): boolean {
  return process.env.VERCEL === '1';
}

/**
 * Check if local CSV import is allowed (only when not on Vercel)
 */
export function isLocalImportAllowed(): boolean {
  return !isVercel();
}

/**
 * Check if cover extraction is allowed (only when not on Vercel)
 * Cover extraction requires local filesystem access which doesn't work on Vercel
 */
export function isCoverExtractionAllowed(): boolean {
  return !isVercel();
}

/**
 * Check if Turso environment variables are configured
 */
export function hasTursoConfig(): boolean {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

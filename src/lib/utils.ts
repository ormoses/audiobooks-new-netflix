// Utility functions for formatting and data transformation

/**
 * Format duration in seconds to "Xh Ym" format
 * @param seconds Duration in seconds, or null/undefined
 * @returns Formatted string like "12h 05m" or "Unknown"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) {
    return 'Unknown';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}m`;
}

/**
 * Format bytes to human-readable size
 * @param bytes Size in bytes
 * @returns Formatted string like "1.5 GB" or "Unknown"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes < 0) {
    return 'Unknown';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 2 : 0)} ${units[unitIndex]}`;
}

/**
 * Normalize a Windows path for consistent storage
 * - Trim whitespace
 * - Use consistent backslashes
 * - Remove trailing slashes
 * @param path Raw path string
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  if (!path) return '';

  return path
    .trim()
    // Convert forward slashes to backslashes for Windows consistency
    .replace(/\//g, '\\')
    // Remove duplicate backslashes
    .replace(/\\+/g, '\\')
    // Remove trailing backslash (unless it's a root like C:\)
    .replace(/\\$/, '')
    // Restore root drive trailing backslash if needed
    .replace(/^([A-Za-z]:)$/, '$1\\');
}

/**
 * Parse boolean from CSV string value
 * @param value String like "TRUE", "FALSE", "true", "1", "0", etc.
 * @returns boolean or null if empty/invalid
 */
export function parseCsvBoolean(value: string | undefined): boolean | null {
  if (!value || value.trim() === '') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === 'TRUE' || normalized === '1' || normalized === 'YES') {
    return true;
  }
  if (normalized === 'FALSE' || normalized === '0' || normalized === 'NO') {
    return false;
  }
  return null;
}

/**
 * Parse integer from CSV string value
 * @param value String number
 * @returns number or null if empty/invalid
 */
export function parseCsvInt(value: string | undefined): number | null {
  if (!value || value.trim() === '') {
    return null;
  }
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse string from CSV, returning null for empty values
 * @param value CSV string value
 * @returns trimmed string or null
 */
export function parseCsvString(value: string | undefined): string | null {
  if (!value || value.trim() === '') {
    return null;
  }
  return value.trim();
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Format a date string for display
 * @param dateString ISO date string
 * @returns Formatted date like "Jan 29, 2026 at 10:30 AM"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'Never';
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

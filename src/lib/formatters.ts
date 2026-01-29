// Client-safe formatting utilities
// This module contains only pure functions with no server-only imports

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
 * Format a date string for display (with time)
 * Uses fixed locale to avoid SSR/client hydration mismatch
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

/**
 * Format a date string for display (date only, no time)
 * Uses fixed locale (en-GB) and UTC timezone to ensure consistent
 * rendering between SSR and client (avoids hydration mismatch)
 * @param dateString ISO date string
 * @returns Formatted date like "29 Jan 2026"
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'Unknown';
  }
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Date utilities for Qatar timezone (Asia/Qatar, UTC+3).
 * All phase dates should start at 00:00 and end at 23:59:59 Qatar time.
 */

const QATAR_OFFSET_HOURS = 3;

/**
 * Parse a date string (YYYY-MM-DD or ISO) to start of day in Qatar timezone.
 * Returns a Date representing 00:00:00 Asia/Qatar.
 */
export function toQatarStartOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  // 00:00 Qatar = 21:00 previous day UTC (UTC+3)
  return new Date(Date.UTC(year, month - 1, day, 0 - QATAR_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Parse a date string (YYYY-MM-DD or ISO) to end of day in Qatar timezone.
 * Returns a Date representing 23:59:59 Asia/Qatar.
 */
export function toQatarEndOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  // 23:59:59 Qatar = 20:59:59 same day UTC (UTC+3)
  return new Date(Date.UTC(year, month - 1, day, 23 - QATAR_OFFSET_HOURS, 59, 59, 999));
}

/**
 * Parse a phase start date — access begins at 00:00 Qatar time.
 */
export function parsePhaseStart(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return toQatarStartOfDay(dateStr);
}

/**
 * Parse a phase end date — access ends at 23:59:59 Qatar time.
 */
export function parsePhaseEnd(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return toQatarEndOfDay(dateStr);
}

/**
 * Parse an event date (single day, start of day Qatar time).
 */
export function parseEventDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return toQatarStartOfDay(dateStr);
}

/**
 * Convert an ISO date string (from DB) to YYYY-MM-DD in Qatar timezone for display.
 * Use this instead of .slice(0, 10) or .toISOString().split('T')[0].
 *
 * When given a Date object (e.g., from calendar picker), extracts the local date
 * components directly — the user picked that date visually.
 * When given a string (from DB/API), interprets it in Qatar timezone.
 */
export function toQatarDateString(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  if (iso instanceof Date) {
    // Date from calendar picker — use local date components (what user clicked)
    return `${iso.getFullYear()}-${String(iso.getMonth() + 1).padStart(2, '0')}-${String(iso.getDate()).padStart(2, '0')}`;
  }
  // String from DB — convert UTC to Qatar timezone
  const d = new Date(iso);
  const qatarTime = new Date(d.getTime() + QATAR_OFFSET_HOURS * 60 * 60 * 1000);
  return `${qatarTime.getUTCFullYear()}-${String(qatarTime.getUTCMonth() + 1).padStart(2, '0')}-${String(qatarTime.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Format a date for display in Qatar timezone (e.g., "Jun 1, 2026").
 */
export function formatQatarDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Qatar',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date+time for display in Qatar timezone (e.g., "Jun 1, 2026, 02:30 PM").
 */
export function formatQatarDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Qatar',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date+time as "YYYY-MM-DD HH:mm:ss" in Qatar timezone.
 * Use for exports and logs instead of .toISOString().
 */
export function formatQatarTimestamp(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-CA', {
    timeZone: 'Asia/Qatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
}

/**
 * Get today's date as YYYY-MM-DD in Qatar timezone.
 */
export function todayQatar(): string {
  const now = new Date();
  const qatarTime = new Date(now.getTime() + QATAR_OFFSET_HOURS * 60 * 60 * 1000);
  return `${qatarTime.getUTCFullYear()}-${String(qatarTime.getUTCMonth() + 1).padStart(2, '0')}-${String(qatarTime.getUTCDate()).padStart(2, '0')}`;
}

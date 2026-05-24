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

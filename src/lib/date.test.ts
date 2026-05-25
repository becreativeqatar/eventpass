import { describe, it, expect } from 'vitest';
import {
  toQatarStartOfDay,
  toQatarEndOfDay,
  parsePhaseStart,
  parsePhaseEnd,
  parseEventDate,
  toQatarDateString,
  formatQatarDate,
} from './date';

describe('toQatarStartOfDay', () => {
  it('converts YYYY-MM-DD to 00:00:00 Qatar time (UTC-3 hours)', () => {
    const result = toQatarStartOfDay('2026-06-15');
    // 00:00 Qatar = 21:00 previous day UTC
    expect(result.toISOString()).toBe('2026-06-14T21:00:00.000Z');
  });

  it('handles ISO string input by extracting the date part', () => {
    const result = toQatarStartOfDay('2026-01-01T15:30:00.000Z');
    // Should use only 2026-01-01
    expect(result.toISOString()).toBe('2025-12-31T21:00:00.000Z');
  });

  it('handles year boundary (Jan 1)', () => {
    const result = toQatarStartOfDay('2026-01-01');
    expect(result.toISOString()).toBe('2025-12-31T21:00:00.000Z');
  });

  it('handles month boundary', () => {
    const result = toQatarStartOfDay('2026-03-01');
    expect(result.toISOString()).toBe('2026-02-28T21:00:00.000Z');
  });

  it('handles leap year date', () => {
    const result = toQatarStartOfDay('2028-02-29');
    expect(result.toISOString()).toBe('2028-02-28T21:00:00.000Z');
  });
});

describe('toQatarEndOfDay', () => {
  it('converts YYYY-MM-DD to 23:59:59.999 Qatar time', () => {
    const result = toQatarEndOfDay('2026-06-15');
    // 23:59:59.999 Qatar = 20:59:59.999 same day UTC
    expect(result.toISOString()).toBe('2026-06-15T20:59:59.999Z');
  });

  it('handles year boundary (Dec 31)', () => {
    const result = toQatarEndOfDay('2026-12-31');
    expect(result.toISOString()).toBe('2026-12-31T20:59:59.999Z');
  });

  it('handles ISO string input', () => {
    const result = toQatarEndOfDay('2026-06-15T10:00:00.000Z');
    expect(result.toISOString()).toBe('2026-06-15T20:59:59.999Z');
  });
});

describe('parsePhaseStart', () => {
  it('returns null for null input', () => {
    expect(parsePhaseStart(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parsePhaseStart(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parsePhaseStart('')).toBeNull();
  });

  it('returns start of day in Qatar time for valid date', () => {
    const result = parsePhaseStart('2026-06-15');
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe('2026-06-14T21:00:00.000Z');
  });
});

describe('parsePhaseEnd', () => {
  it('returns null for null input', () => {
    expect(parsePhaseEnd(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parsePhaseEnd(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parsePhaseEnd('')).toBeNull();
  });

  it('returns end of day in Qatar time for valid date', () => {
    const result = parsePhaseEnd('2026-06-15');
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe('2026-06-15T20:59:59.999Z');
  });
});

describe('parseEventDate', () => {
  it('returns null for null input', () => {
    expect(parseEventDate(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseEventDate(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseEventDate('')).toBeNull();
  });

  it('returns start of day in Qatar time for valid date', () => {
    const result = parseEventDate('2026-09-20');
    expect(result).not.toBeNull();
    expect(result!.toISOString()).toBe('2026-09-19T21:00:00.000Z');
  });
});

describe('toQatarDateString', () => {
  it('returns empty string for null', () => {
    expect(toQatarDateString(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(toQatarDateString(undefined)).toBe('');
  });

  it('converts Date object using local date components', () => {
    // Date object: use getFullYear/getMonth/getDate (local)
    const d = new Date(2026, 5, 15); // June 15, 2026 local
    const result = toQatarDateString(d);
    expect(result).toBe('2026-06-15');
  });

  it('pads single-digit month and day with zeros', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    const result = toQatarDateString(d);
    expect(result).toBe('2026-01-05');
  });

  it('converts ISO string from DB using Qatar timezone offset', () => {
    // 2026-06-14T21:00:00Z = 2026-06-15 00:00 Qatar
    const result = toQatarDateString('2026-06-14T21:00:00.000Z');
    expect(result).toBe('2026-06-15');
  });

  it('handles ISO string where UTC and Qatar dates differ', () => {
    // 2026-06-15T22:00:00Z = 2026-06-16 01:00 Qatar
    const result = toQatarDateString('2026-06-15T22:00:00.000Z');
    expect(result).toBe('2026-06-16');
  });

  it('handles ISO string where UTC and Qatar dates are the same', () => {
    // 2026-06-15T10:00:00Z = 2026-06-15 13:00 Qatar
    const result = toQatarDateString('2026-06-15T10:00:00.000Z');
    expect(result).toBe('2026-06-15');
  });
});

describe('formatQatarDate', () => {
  it('returns em dash for null', () => {
    expect(formatQatarDate(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatQatarDate(undefined)).toBe('—');
  });

  it('formats ISO string in Qatar timezone', () => {
    // 2026-06-14T21:00:00Z = Jun 15 in Qatar
    const result = formatQatarDate('2026-06-14T21:00:00.000Z');
    expect(result).toBe('Jun 15, 2026');
  });

  it('formats Date object in Qatar timezone', () => {
    const d = new Date('2026-06-14T21:00:00.000Z');
    const result = formatQatarDate(d);
    expect(result).toBe('Jun 15, 2026');
  });

  it('formats date where UTC and Qatar dates differ', () => {
    // 2026-12-31T22:00:00Z = Jan 1, 2027 01:00 Qatar
    const result = formatQatarDate('2026-12-31T22:00:00.000Z');
    expect(result).toBe('Jan 1, 2027');
  });
});

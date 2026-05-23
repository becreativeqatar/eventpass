import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts — last value wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('resolves conflicting text colors', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('resolves conflicting font sizes', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('keeps non-conflicting classes', () => {
    const result = cn('p-4', 'mx-2', 'text-red-500');
    expect(result).toContain('p-4');
    expect(result).toContain('mx-2');
    expect(result).toContain('text-red-500');
  });

  it('handles undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('handles null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar');
  });

  it('handles false values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('handles conditional class objects', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string for all falsy', () => {
    expect(cn(undefined, null, false)).toBe('');
  });
});

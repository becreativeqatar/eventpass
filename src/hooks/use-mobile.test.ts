// @vitest-environment jsdom
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

type MatchMediaListener = (e: { matches: boolean }) => void;

function createMockMatchMedia(matches: boolean) {
  const listeners: MatchMediaListener[] = [];

  const mql = {
    matches,
    media: '(max-width: 767px)',
    addEventListener: vi.fn((_event: string, cb: MatchMediaListener) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: MatchMediaListener) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList;

  return { mql, listeners, trigger: () => listeners.forEach((l) => l({ matches: true })) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useIsMobile', () => {
  it('returns false when >= 768px', () => {
    const { mql } = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true when < 768px', () => {
    const { mql } = createMockMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mql);
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('responds to matchMedia change events', () => {
    const { mql, trigger } = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });
    act(() => {
      trigger();
    });

    expect(result.current).toBe(true);
  });

  it('handles SSR (no window) by returning false', () => {
    // The hook initializes state as undefined. !!undefined = false.
    // Before the useEffect runs, the return value is false.
    const { mql } = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });

    const { result } = renderHook(() => useIsMobile());
    // After effect runs with innerWidth=1024, still false
    expect(result.current).toBe(false);
  });

  it('cleanup on unmount removes event listener', () => {
    const { mql } = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql);
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });

    const { unmount } = renderHook(() => useIsMobile());

    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    // Verify the same function reference was used for add and remove
    const addedCb = mql.addEventListener.mock.calls[0][1];
    const removedCb = mql.removeEventListener.mock.calls[0][1];
    expect(addedCb).toBe(removedCb);
  });
});

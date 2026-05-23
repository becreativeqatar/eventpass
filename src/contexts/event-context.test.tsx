// @vitest-environment jsdom
import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import { EventProvider, useEventContext, type EventSummary } from '@/contexts/event-context';
import { useSession } from 'next-auth/react';

const mockUseSession = vi.mocked(useSession);

function buildEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: 'evt-1',
    name: 'Test Event',
    code: 'TE1',
    status: 'ACTIVE',
    description: null,
    venue: null,
    eventDate: null,
    _count: { accreditations: 0 },
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <EventProvider>{children}</EventProvider>;
}

function mockFetchSuccess(events: EventSummary[]) {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ data: events }),
  } as Response);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Clear cookies and localStorage
  document.cookie = 'ep_selected_event=; max-age=0';
  localStorage.clear();
});

describe('EventProvider', () => {
  it('fetches events when authenticated', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });
    const events = [buildEvent()];
    mockFetchSuccess(events);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/events');
    expect(result.current.events).toHaveLength(1);
    expect(result.current.selectedProject?.id).toBe('evt-1');
  });

  it('does not fetch when unauthenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });
    mockFetchSuccess([]);

    renderHook(() => useEventContext(), { wrapper });

    // Give it a tick to ensure no fetch was called
    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('selects persisted event from cookie/localStorage', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const events = [
      buildEvent({ id: 'evt-1', status: 'COMPLETED' }),
      buildEvent({ id: 'evt-2', status: 'ACTIVE' }),
    ];

    // Persist evt-1 in cookie
    document.cookie = 'ep_selected_event=evt-1; path=/';
    mockFetchSuccess(events);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should select the persisted event, not the ACTIVE one
    expect(result.current.selectedProject?.id).toBe('evt-1');
  });

  it('falls back to active event when no persisted selection', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const events = [
      buildEvent({ id: 'evt-1', status: 'COMPLETED' }),
      buildEvent({ id: 'evt-2', status: 'ACTIVE' }),
      buildEvent({ id: 'evt-3', status: 'DRAFT' }),
    ];
    mockFetchSuccess(events);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedProject?.id).toBe('evt-2');
  });

  it('falls back to first event when no active', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const events = [
      buildEvent({ id: 'evt-1', status: 'COMPLETED' }),
      buildEvent({ id: 'evt-2', status: 'DRAFT' }),
    ];
    mockFetchSuccess(events);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedProject?.id).toBe('evt-1');
  });

  it('selectEvent updates state', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const events = [
      buildEvent({ id: 'evt-1', status: 'ACTIVE' }),
      buildEvent({ id: 'evt-2', status: 'DRAFT', name: 'Draft Event' }),
    ];
    mockFetchSuccess(events);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.selectedProject?.id).toBe('evt-1');

    act(() => {
      result.current.selectEvent('evt-2');
    });

    expect(result.current.selectedProject?.id).toBe('evt-2');
    expect(localStorage.getItem('ep_selected_event')).toBe('evt-2');
    expect(document.cookie).toContain('ep_selected_event=evt-2');
  });

  it('isReadOnly is true when project status !== ACTIVE', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const events = [buildEvent({ id: 'evt-1', status: 'COMPLETED' })];
    mockFetchSuccess(events);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReadOnly).toBe(true);
  });

  it('isReadOnly is false when ACTIVE', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const events = [buildEvent({ id: 'evt-1', status: 'ACTIVE' })];
    mockFetchSuccess(events);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReadOnly).toBe(false);
  });

  it('useEventContext throws outside provider', () => {
    // Suppress console.error for expected error boundary throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useEventContext());
    }).toThrow('useEventContext must be used within EventProvider');

    spy.mockRestore();
  });

  it('refetchEvents re-fetches', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const initialEvents = [buildEvent({ id: 'evt-1', status: 'ACTIVE' })];
    mockFetchSuccess(initialEvents);

    const { result } = renderHook(() => useEventContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Update fetch to return new data
    const updatedEvents = [
      buildEvent({ id: 'evt-1', status: 'ACTIVE' }),
      buildEvent({ id: 'evt-new', status: 'DRAFT', name: 'New Event' }),
    ];
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: updatedEvents }),
    } as Response);

    await act(async () => {
      await result.current.refetchEvents();
    });

    expect(result.current.events).toHaveLength(2);
  });
});

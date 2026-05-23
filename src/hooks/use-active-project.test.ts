// @vitest-environment jsdom
import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUseEventContext = vi.fn();

vi.mock('@/contexts/event-context', () => ({
  useEventContext: () => mockUseEventContext(),
}));

import { useActiveProject } from '@/hooks/use-active-project';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useActiveProject', () => {
  it('returns selectedProject as project', () => {
    const mockProject = {
      id: 'proj-1',
      name: 'Test Event',
      code: 'TE1',
      status: 'ACTIVE',
    };

    mockUseEventContext.mockReturnValue({
      selectedProject: mockProject,
      isLoading: false,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.project).toEqual(mockProject);
    expect(result.current.project?.id).toBe('proj-1');
  });

  it('returns isLoading from context', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.project).toBeNull();
  });

  it('error is always null', () => {
    mockUseEventContext.mockReturnValue({
      selectedProject: { id: 'p1', name: 'E' },
      isLoading: false,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.error).toBeNull();
  });
});

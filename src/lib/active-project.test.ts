vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      findFirst: vi.fn(),
      updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  getActiveProject,
  requireActiveProject,
  getSelectedProject,
} from '@/lib/active-project';

const mockFindFirst = vi.mocked(prisma.accreditationProject.findFirst);
const mockCookies = vi.mocked(cookies);

const activeProject = {
  id: 'proj-1',
  name: 'Active Event',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('getActiveProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the first ACTIVE project', async () => {
    mockFindFirst.mockResolvedValue(activeProject);

    const result = await getActiveProject();

    expect(result).toEqual(activeProject);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns null when no active project exists', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getActiveProject();
    expect(result).toBeNull();
  });
});

describe('requireActiveProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the active project when one exists', async () => {
    mockFindFirst.mockResolvedValue(activeProject);

    const result = await requireActiveProject();
    expect(result).toEqual(activeProject);
  });

  it('throws when no active project exists', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(requireActiveProject()).rejects.toThrow(
      'No active event configured',
    );
  });
});

describe('getSelectedProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns project from cookie when found', async () => {
    const cookieProject = { ...activeProject, id: 'proj-cookie', name: 'Cookie Event' };

    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === 'ep_selected_event' ? { name, value: 'proj-cookie' } : undefined,
      ),
    } as never);
    // getSelectedProject now uses findFirst with an OR clause for id/code lookup
    mockFindFirst.mockResolvedValueOnce(cookieProject);

    const result = await getSelectedProject();

    expect(result).toEqual(cookieProject);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: 'proj-cookie' },
          { code: { equals: 'proj-cookie', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('falls back to active project when cookie project not found in DB', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === 'ep_selected_event' ? { name, value: 'nonexistent-id' } : undefined,
      ),
    } as never);
    // First findFirst call (cookie lookup) returns null, second (getActiveProject) returns activeProject
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(activeProject);

    const result = await getSelectedProject();

    expect(result).toEqual(activeProject);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('falls back to active project when no cookie set', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    } as never);
    mockFindFirst.mockResolvedValue(activeProject);

    const result = await getSelectedProject();

    expect(result).toEqual(activeProject);
    // When no cookie, findFirst should only be called once (via getActiveProject), not for cookie lookup
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  it('returns null when no cookie and no active project', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    } as never);
    mockFindFirst.mockResolvedValue(null);

    const result = await getSelectedProject();
    expect(result).toBeNull();
  });
});

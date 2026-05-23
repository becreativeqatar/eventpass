import { vi } from 'vitest';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/active-project', () => ({
  getActiveProject: vi.fn(),
}));

import { GET } from '@/app/api/active-project/route';
import { getServerSession } from 'next-auth/next';
import { getActiveProject } from '@/lib/active-project';
import {
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildProject, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockGetActiveProject = vi.mocked(getActiveProject);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/active-project
// ---------------------------------------------------------------------------
describe('GET /api/active-project', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns project: null when no active project', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockGetActiveProject.mockResolvedValue(null);

    const res = await GET();
    const body = await parseJsonResponse<{ project: null }>(res);

    expect(res.status).toBe(200);
    expect(body.project).toBeNull();
  });

  it('returns project with accessGroups parsed as array', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({
      status: 'ACTIVE',
      accessGroups: 'General,VIP,Media',
    });
    mockGetActiveProject.mockResolvedValue(project as never);

    const res = await GET();
    const body = await parseJsonResponse<{
      project: { accessGroups: string[]; name: string };
    }>(res);

    expect(res.status).toBe(200);
    expect(body.project.accessGroups).toEqual(['General', 'VIP', 'Media']);
    expect(body.project.name).toBe(project.name);
  });

  it('returns empty accessGroups array when accessGroups is null', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({
      status: 'ACTIVE',
      accessGroups: null,
    });
    mockGetActiveProject.mockResolvedValue(project as never);

    const res = await GET();
    const body = await parseJsonResponse<{
      project: { accessGroups: string[] };
    }>(res);

    expect(res.status).toBe(200);
    expect(body.project.accessGroups).toEqual([]);
  });
});

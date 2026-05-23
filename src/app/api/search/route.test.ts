import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/active-project', () => ({
  getSelectedProject: vi.fn(),
}));

import { GET } from '@/app/api/search/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { getSelectedProject } from '@/lib/active-project';
import {
  createMockRequest,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildProject, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockGetSelectedProject = vi.mocked(getSelectedProject);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/search
// ---------------------------------------------------------------------------
describe('GET /api/search', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/search', {
      searchParams: { q: 'test' },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns empty arrays when query is too short (< 2 chars)', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/search', {
      searchParams: { q: 'a' },
    });
    const res = await GET(req);
    const body = await parseJsonResponse<{
      accreditations: unknown[];
      users: unknown[];
    }>(res);

    expect(res.status).toBe(200);
    expect(body.accreditations).toEqual([]);
    expect(body.users).toEqual([]);
  });

  it('returns empty arrays when query is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/search');
    const res = await GET(req);
    const body = await parseJsonResponse<{
      accreditations: unknown[];
      users: unknown[];
    }>(res);

    expect(res.status).toBe(200);
    expect(body.accreditations).toEqual([]);
    expect(body.users).toEqual([]);
  });

  it('searches accreditations in active project', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    const project = buildProject({ id: 'project-1' });
    mockGetSelectedProject.mockResolvedValue(project as never);

    mockPrisma.accreditation.findMany.mockResolvedValue([
      { id: 'acc-1', firstName: 'John', lastName: 'Doe', company: 'TestCo', accreditationNumber: 'ACC-0001', status: 'APPROVED' },
    ] as never);
    mockPrisma.user.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/search', {
      searchParams: { q: 'John' },
    });
    const res = await GET(req);
    const body = await parseJsonResponse<{
      accreditations: Array<{ firstName: string }>;
    }>(res);

    expect(res.status).toBe(200);
    expect(body.accreditations).toHaveLength(1);
    expect(body.accreditations[0].firstName).toBe('John');

    // Verify it searched within the active project
    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.where.projectId).toBe('project-1');
  });

  it('returns users only for ADMIN role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    const project = buildProject();
    mockGetSelectedProject.mockResolvedValue(project as never);

    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-2', name: 'Jane Admin', email: 'jane@test.com', role: 'MANAGER' },
    ] as never);

    const req = createMockRequest('/api/search', {
      searchParams: { q: 'jane' },
    });
    const res = await GET(req);
    const body = await parseJsonResponse<{ users: Array<{ name: string }> }>(res);

    expect(body.users).toHaveLength(1);
    expect(body.users[0].name).toBe('Jane Admin');
  });

  it('does not return users for non-ADMIN role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));
    const project = buildProject();
    mockGetSelectedProject.mockResolvedValue(project as never);

    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/search', {
      searchParams: { q: 'test' },
    });
    const res = await GET(req);
    const body = await parseJsonResponse<{ users: unknown[] }>(res);

    expect(body.users).toEqual([]);
    // user.findMany should not have been called
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });
});

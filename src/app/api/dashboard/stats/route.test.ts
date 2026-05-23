import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      count: vi.fn(),
    },
    accreditationScan: {
      count: vi.fn(),
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

import { GET } from '@/app/api/dashboard/stats/route';
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
// GET /api/dashboard/stats
// ---------------------------------------------------------------------------
describe('GET /api/dashboard/stats', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns stats: null when no active project', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockGetSelectedProject.mockResolvedValue(null);

    const res = await GET();
    const body = await parseJsonResponse<{ stats: null }>(res);

    expect(res.status).toBe(200);
    expect(body.stats).toBeNull();
  });

  it('returns status counts for active project', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({ id: 'project-1', status: 'ACTIVE' });
    mockGetSelectedProject.mockResolvedValue(project as never);

    // total, approved, pending, rejected, draft, scans
    mockPrisma.accreditation.count
      .mockResolvedValueOnce(100 as never)
      .mockResolvedValueOnce(60 as never)
      .mockResolvedValueOnce(20 as never)
      .mockResolvedValueOnce(10 as never)
      .mockResolvedValueOnce(10 as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(200 as never);
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);

    const res = await GET();
    const body = await parseJsonResponse<{
      stats: { total: number; approved: number; pending: number; rejected: number; draft: number; scans: number };
      scanActivity: unknown[];
      funnel: unknown[];
    }>(res);

    expect(res.status).toBe(200);
    expect(body.stats.total).toBe(100);
    expect(body.stats.approved).toBe(60);
    expect(body.stats.pending).toBe(20);
    expect(body.stats.rejected).toBe(10);
    expect(body.stats.draft).toBe(10);
    expect(body.stats.scans).toBe(200);
  });

  it('returns scanActivity array with 7 days', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({ id: 'project-1', status: 'ACTIVE' });
    mockGetSelectedProject.mockResolvedValue(project as never);

    mockPrisma.accreditation.count.mockResolvedValue(0 as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(0 as never);
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);

    const res = await GET();
    const body = await parseJsonResponse<{ scanActivity: Array<{ date: string; label: string; scans: number }> }>(res);

    expect(body.scanActivity).toHaveLength(7);
    expect(body.scanActivity[0]).toHaveProperty('date');
    expect(body.scanActivity[0]).toHaveProperty('label');
    expect(body.scanActivity[0]).toHaveProperty('scans');
  });

  it('returns funnel array with status breakdown', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({ id: 'project-1', status: 'ACTIVE' });
    mockGetSelectedProject.mockResolvedValue(project as never);

    mockPrisma.accreditation.count
      .mockResolvedValueOnce(10 as never) // total
      .mockResolvedValueOnce(5 as never) // approved
      .mockResolvedValueOnce(2 as never) // pending
      .mockResolvedValueOnce(1 as never) // rejected
      .mockResolvedValueOnce(2 as never); // draft
    mockPrisma.accreditationScan.count.mockResolvedValue(0 as never);
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);

    const res = await GET();
    const body = await parseJsonResponse<{ funnel: Array<{ name: string; value: number }> }>(res);

    expect(body.funnel).toHaveLength(4);
    const names = body.funnel.map((f) => f.name);
    expect(names).toContain('Draft');
    expect(names).toContain('Pending');
    expect(names).toContain('Approved');
    expect(names).toContain('Rejected');
  });
});

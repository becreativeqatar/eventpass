import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      count: vi.fn(),
    },
    accreditationScan: {
      count: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { GET } from '@/app/api/accreditation/projects/[id]/stats/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/accreditation/projects/[id]/stats
// ---------------------------------------------------------------------------
describe('GET /api/accreditation/projects/[id]/stats', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditation/projects/project-1/stats');
    const res = await GET(req, createMockContext({ id: 'project-1' }));

    expect(res.status).toBe(401);
  });

  it('returns status counts for the project', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    // totalAccreditations, draft, pending, approved, rejected, totalScans
    mockPrisma.accreditation.count
      .mockResolvedValueOnce(50 as never)
      .mockResolvedValueOnce(5 as never)
      .mockResolvedValueOnce(10 as never)
      .mockResolvedValueOnce(30 as never)
      .mockResolvedValueOnce(5 as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(100 as never);

    const req = createMockRequest('/api/accreditation/projects/project-1/stats');
    const res = await GET(req, createMockContext({ id: 'project-1' }));
    const body = await parseJsonResponse<{
      totalAccreditations: number;
      draftAccreditations: number;
      pendingAccreditations: number;
      approvedAccreditations: number;
      rejectedAccreditations: number;
      totalScans: number;
    }>(res);

    expect(res.status).toBe(200);
    expect(body.totalAccreditations).toBe(50);
    expect(body.draftAccreditations).toBe(5);
    expect(body.pendingAccreditations).toBe(10);
    expect(body.approvedAccreditations).toBe(30);
    expect(body.rejectedAccreditations).toBe(5);
    expect(body.totalScans).toBe(100);
  });

  it('queries with the correct project id', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.count.mockResolvedValue(0 as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/accreditation/projects/proj-xyz/stats');
    await GET(req, createMockContext({ id: 'proj-xyz' }));

    const firstCall = (mockPrisma.accreditation.count as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstCall.where.projectId).toBe('proj-xyz');
  });
});

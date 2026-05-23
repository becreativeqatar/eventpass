import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationScan: {
      findMany: vi.fn(),
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

import { GET } from '@/app/api/scans/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildScan, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/scans
// ---------------------------------------------------------------------------
describe('GET /api/scans', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/scans');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns paginated scans with default page/limit', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const scan = buildScan({
      accreditation: {
        accreditationNumber: 'ACC-0001',
        firstName: 'John',
        lastName: 'Doe',
        company: 'TestCo',
        role: 'Staff',
        project: { id: 'project-1', name: 'Event' },
      },
      scannedBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
    });
    mockPrisma.accreditationScan.findMany.mockResolvedValue([scan] as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(1 as never);

    const req = createMockRequest('/api/scans');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{
      data: unknown[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 1, pages: 1 });
  });

  it('filters by projectId', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/scans', {
      searchParams: { projectId: 'project-42' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditationScan.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.accreditation).toEqual({ projectId: 'project-42' });
  });

  it('filters by phase and result', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/scans', {
      searchParams: { phase: 'LIVE', result: 'ALLOWED' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditationScan.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.phase).toBe('LIVE');
    expect(whereArg.result).toBe('ALLOWED');
  });

  it('filters by date range (from/to)', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/scans', {
      searchParams: { from: '2025-01-01', to: '2025-12-31' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditationScan.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.scannedAt.gte).toEqual(new Date('2025-01-01'));
    expect(whereArg.scannedAt.lte).toEqual(new Date('2025-12-31'));
  });

  it('respects page and limit params', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(100 as never);

    const req = createMockRequest('/api/scans', {
      searchParams: { page: '3', limit: '10' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(res);

    const findArgs = (mockPrisma.accreditationScan.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.skip).toBe(20); // (3-1)*10
    expect(findArgs.take).toBe(10);
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.pages).toBe(10);
  });
});

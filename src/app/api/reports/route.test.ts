import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    accreditation: {
      count: vi.fn(),
      findMany: vi.fn(),
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

import { GET } from '@/app/api/reports/route';
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
// GET /api/reports
// ---------------------------------------------------------------------------
describe('GET /api/reports', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/reports');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin/non-manager role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/reports');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(403);
  });

  it('returns summary report by default', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationProject.count.mockResolvedValue(3 as never);
    mockPrisma.accreditation.count
      .mockResolvedValueOnce(50 as never) // total accreditations
      .mockResolvedValueOnce(5 as never); // pending approvals
    mockPrisma.accreditationScan.count.mockResolvedValue(100 as never);

    const req = createMockRequest('/api/reports');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{
      data: { projects: number; accreditations: number; scans: number; pendingApprovals: number };
    }>(res);

    expect(res.status).toBe(200);
    expect(body.data.projects).toBe(3);
    expect(body.data.accreditations).toBe(50);
    expect(body.data.scans).toBe(100);
    expect(body.data.pendingApprovals).toBe(5);
  });

  it('allows MANAGER role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));
    mockPrisma.accreditationProject.count.mockResolvedValue(1 as never);
    mockPrisma.accreditation.count.mockResolvedValue(0 as never);
    mockPrisma.accreditationScan.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/reports');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(200);
  });

  it('returns by-project report', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationProject.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Project A',
        status: 'ACTIVE',
        eventDate: new Date(),
        _count: { accreditations: 3 },
        accreditations: [
          { status: 'APPROVED' },
          { status: 'APPROVED' },
          { status: 'PENDING' },
        ],
      },
    ] as never);

    const req = createMockRequest('/api/reports', {
      searchParams: { type: 'by-project' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: Array<{ name: string; total: number }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Project A');
    expect(body.data[0].total).toBe(3);
  });

  it('returns by-company report', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditation.findMany.mockResolvedValue([
      { company: 'Acme Corp', status: 'APPROVED' },
      { company: 'Acme Corp', status: 'PENDING' },
      { company: 'Beta Inc', status: 'APPROVED' },
    ] as never);

    const req = createMockRequest('/api/reports', {
      searchParams: { type: 'by-company' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: Array<{ company: string; total: number }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    // sorted by total descending
    expect(body.data[0].company).toBe('Acme Corp');
    expect(body.data[0].total).toBe(2);
  });

  it('returns scan-activity report grouped by date', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationScan.findMany.mockResolvedValue([
      { scannedAt: new Date('2025-06-01T10:00:00Z'), result: 'ALLOWED', phase: 'LIVE' },
      { scannedAt: new Date('2025-06-01T12:00:00Z'), result: 'DENIED', phase: 'LIVE' },
      { scannedAt: new Date('2025-06-02T09:00:00Z'), result: 'ALLOWED', phase: 'BUMP_IN' },
    ] as never);

    const req = createMockRequest('/api/reports', {
      searchParams: { type: 'scan-activity' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: Array<{ date: string; total: number }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].date).toBe('2025-06-01');
    expect(body.data[0].total).toBe(2);
  });

  it('returns 400 for invalid report type', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));

    const req = createMockRequest('/api/reports', {
      searchParams: { type: 'invalid-type' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid report type');
  });
});

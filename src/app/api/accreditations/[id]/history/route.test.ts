import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationHistory: {
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

import { GET } from '@/app/api/accreditations/[id]/history/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildHistory, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('GET /api/accreditations/[id]/history', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/history');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns history entries ordered by performedAt desc', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const older = buildHistory({
      accreditationId: 'acc-1',
      action: 'CREATED',
      performedAt: new Date('2025-01-01'),
      performedBy: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
    });
    const newer = buildHistory({
      accreditationId: 'acc-1',
      action: 'APPROVED',
      performedAt: new Date('2025-01-02'),
      performedBy: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
    });

    mockPrisma.accreditationHistory.findMany.mockResolvedValue([newer, older] as never);

    const req = createMockRequest('/api/accreditations/acc-1/history');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: Array<{ action: string }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].action).toBe('APPROVED');
    expect(body.data[1].action).toBe('CREATED');

    // Verify query used correct ordering
    const queryArgs = (mockPrisma.accreditationHistory.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(queryArgs.orderBy).toEqual({ performedAt: 'desc' });
  });

  it('includes performedBy user in response', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const history = buildHistory({
      accreditationId: 'acc-1',
      performedBy: { id: 'user-1', name: 'Admin User', email: 'admin@test.com' },
    });
    mockPrisma.accreditationHistory.findMany.mockResolvedValue([history] as never);

    const req = createMockRequest('/api/accreditations/acc-1/history');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: Array<{ performedBy: { id: string; name: string; email: string } }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data[0].performedBy).toEqual({
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@test.com',
    });

    // Verify include was specified
    const queryArgs = (mockPrisma.accreditationHistory.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(queryArgs.include.performedBy).toEqual({
      select: { id: true, name: true, email: true },
    });
  });

  it('returns empty array when no history exists', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationHistory.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/accreditations/acc-1/history');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: unknown[] }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

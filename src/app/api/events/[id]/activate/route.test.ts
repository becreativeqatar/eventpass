import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { PATCH } from '@/app/api/events/[id]/activate/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildProject, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

function createParamsContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('PATCH /api/events/[id]/activate', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('returns 403 for VALIDATOR role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'VALIDATOR' }));

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('completes current active event and activates target', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const activated = buildProject({ id: 'p-1', status: 'ACTIVE' });
    mockPrisma.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        const tx = {
          accreditationProject: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue(activated),
          },
        };
        return cb(tx);
      }
    });

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ data: { id: string; status: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('p-1');
    expect(body.data.status).toBe('ACTIVE');

    // Verify transaction was called
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('allows MANAGER role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const activated = buildProject({ id: 'p-1', status: 'ACTIVE' });
    mockPrisma.$transaction.mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        const tx = {
          accreditationProject: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue(activated),
          },
        };
        return cb(tx);
      }
    });

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(200);
  });
});

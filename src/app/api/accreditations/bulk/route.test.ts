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

import { POST } from '@/app/api/accreditations/bulk/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockTransaction = vi.mocked(prisma.$transaction);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('POST /api/accreditations/bulk', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'approve', ids: ['acc-1'] },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'approve', ids: ['acc-1'] },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 403 for VALIDATOR role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'VALIDATOR' }));

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'approve', ids: ['acc-1'] },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid action', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'invalid', ids: ['acc-1'] },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when ids array is empty', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'approve', ids: [] },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when ids is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'approve' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('bulk approves PENDING accreditations', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        accreditation: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        accreditationHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      await cb(tx);
    });

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'approve', ids: ['acc-1', 'acc-2'] },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean; affected: number }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.affected).toBe(2);
  });

  it('bulk rejects PENDING accreditations with reason', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        accreditation: {
          updateMany: vi.fn().mockResolvedValue({ count: 3 }),
        },
        accreditationHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      await cb(tx);
    });

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'reject', ids: ['acc-1', 'acc-2', 'acc-3'], reason: 'Incomplete docs' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean; affected: number }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.affected).toBe(3);
  });

  it('bulk deletes DRAFT accreditations', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        accreditation: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        accreditationHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      await cb(tx);
    });

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'delete', ids: ['acc-1'] },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean; affected: number }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.affected).toBe(1);
  });

  it('allows MANAGER role for bulk operations', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER', id: 'mgr-1' }));

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        accreditation: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        accreditationHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      await cb(tx);
    });

    const req = createMockRequest('/api/accreditations/bulk', {
      method: 'POST',
      body: { action: 'approve', ids: ['acc-1'] },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});

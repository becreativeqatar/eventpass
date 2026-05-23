import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findUnique: vi.fn(),
    },
    accreditationHistory: {
      create: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/notifications', () => ({
  notifyAdminOfPendingApproval: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH } from '@/app/api/accreditations/[id]/submit/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildAccreditation, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('PATCH /api/accreditations/[id]/submit', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/submit', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/submit', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns 403 when non-creator non-admin tries to submit', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'other-user', role: 'STAFF' }));
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1', status: 'PENDING', createdById: 'user-1' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/submit', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 400 when status is not PENDING', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1', status: 'APPROVED' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/submit', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot submit');
  });

  it('creates history entry on submit', async () => {
    const session = mockSession({ id: 'user-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING', createdById: 'user-1' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/submit', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);

    const historyArgs = (mockPrisma.accreditationHistory.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(historyArgs.data.action).toBe('SUBMITTED');
    expect(historyArgs.data.oldStatus).toBe('PENDING');
    expect(historyArgs.data.newStatus).toBe('PENDING');
    expect(historyArgs.data.performedById).toBe('user-1');
  });

  it('triggers notification on submit', async () => {
    const { notifyAdminOfPendingApproval } = await import('@/lib/notifications');

    const session = mockSession({ id: 'user-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({
      id: 'acc-1',
      status: 'PENDING',
      createdById: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      company: 'TestCo',
      role: 'VIP',
      accreditationNumber: 'ACC-0001',
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/submit', {
      method: 'PATCH',
      body: {},
    });
    await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(notifyAdminOfPendingApproval).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      company: 'TestCo',
      role: 'VIP',
      accreditationNumber: 'ACC-0001',
    });
  });

  it('returns success with accreditation data', async () => {
    const session = mockSession({ id: 'user-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING', createdById: 'user-1' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/submit', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: { id: string }; message: string }>(res);

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('acc-1');
    expect(body.message).toBe('Accreditation submitted for approval');
  });
});

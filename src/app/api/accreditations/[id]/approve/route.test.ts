import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { PATCH } from '@/app/api/accreditations/[id]/approve/route';
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

describe('PATCH /api/accreditations/[id]/approve', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/approve', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/accreditations/acc-1/approve', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 403 for VALIDATOR role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'VALIDATOR' }));

    const req = createMockRequest('/api/accreditations/acc-1/approve', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/approve', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns 400 when accreditation is not PENDING', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ status: 'APPROVED' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/approve', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot approve');
  });

  it('approves PENDING accreditation and creates history', async () => {
    const session = mockSession({ id: 'admin-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = {
      ...existing,
      status: 'APPROVED',
      approvedById: 'admin-1',
      approvedAt: new Date(),
      project: { id: 'project-1', name: 'Test' },
    };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/approve', {
      method: 'PATCH',
      body: { notes: 'Looks good' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: { status: string }; message: string }>(res);

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('APPROVED');
    expect(body.message).toBe('Accreditation approved successfully');

    // Verify update call
    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.status).toBe('APPROVED');
    expect(updateArgs.data.approvedById).toBe('admin-1');
    expect(updateArgs.data.approvedAt).toBeInstanceOf(Date);

    // Verify history creation
    const historyArgs = (mockPrisma.accreditationHistory.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(historyArgs.data.action).toBe('APPROVED');
    expect(historyArgs.data.oldStatus).toBe('PENDING');
    expect(historyArgs.data.newStatus).toBe('APPROVED');
    expect(historyArgs.data.notes).toBe('Looks good');
    expect(historyArgs.data.performedById).toBe('admin-1');
  });

  it('allows MANAGER to approve', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER', id: 'mgr-1' }));

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditation.update.mockResolvedValue({
      ...existing,
      status: 'APPROVED',
      project: { id: 'project-1', name: 'Test' },
    } as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/approve', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
  });
});

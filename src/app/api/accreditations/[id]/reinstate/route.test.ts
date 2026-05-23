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

import { PATCH } from '@/app/api/accreditations/[id]/reinstate/route';
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

describe('PATCH /api/accreditations/[id]/reinstate', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin/manager role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns 400 when status is PENDING', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ status: 'PENDING' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot reinstate');
  });

  it('returns 400 when status is APPROVED', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ status: 'APPROVED' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(400);
  });

  it('reinstates REVOKED accreditation to APPROVED', async () => {
    const session = mockSession({ id: 'admin-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'REVOKED' });
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

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: { notes: 'Reinstating after review' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: { status: string }; message: string }>(res);

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('APPROVED');
    expect(body.message).toBe('Accreditation reinstated');

    // Verify update
    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.status).toBe('APPROVED');
    expect(updateArgs.data.approvedById).toBe('admin-1');
    expect(updateArgs.data.approvedAt).toBeInstanceOf(Date);

    // Verify history records old status as REVOKED
    const historyArgs = (mockPrisma.accreditationHistory.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(historyArgs.data.action).toBe('REINSTATED');
    expect(historyArgs.data.oldStatus).toBe('REVOKED');
    expect(historyArgs.data.newStatus).toBe('APPROVED');
    expect(historyArgs.data.notes).toBe('Reinstating after review');
    expect(historyArgs.data.performedById).toBe('admin-1');
  });

  it('reinstates REJECTED accreditation to APPROVED', async () => {
    const session = mockSession({ id: 'admin-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'REJECTED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = {
      ...existing,
      status: 'APPROVED',
      project: { id: 'project-1', name: 'Test' },
    };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);

    // Verify history records old status as REJECTED
    const historyArgs = (mockPrisma.accreditationHistory.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(historyArgs.data.oldStatus).toBe('REJECTED');
    expect(historyArgs.data.newStatus).toBe('APPROVED');
  });

  it('allows MANAGER to reinstate', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const existing = buildAccreditation({ status: 'REVOKED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditation.update.mockResolvedValue({
      ...existing,
      status: 'APPROVED',
      project: { id: 'project-1', name: 'Test' },
    } as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/reinstate', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
  });
});

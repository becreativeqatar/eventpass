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

import { PATCH } from '@/app/api/accreditations/[id]/revoke/route';
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

describe('PATCH /api/accreditations/[id]/revoke', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/revoke', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin/manager role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/accreditations/acc-1/revoke', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/revoke', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns 400 when accreditation is not APPROVED', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ status: 'PENDING' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/revoke', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot revoke');
  });

  it('revokes approved accreditation with reason and creates history', async () => {
    const session = mockSession({ id: 'admin-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'APPROVED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = {
      ...existing,
      status: 'REVOKED',
      revokedById: 'admin-1',
      revokedAt: new Date(),
      revokeReason: 'Security concern',
      project: { id: 'project-1', name: 'Test' },
      revokedBy: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/revoke', {
      method: 'PATCH',
      body: { reason: 'Security concern' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: { status: string }; message: string }>(res);

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('REVOKED');
    expect(body.message).toBe('Accreditation revoked');

    // Verify update call
    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.status).toBe('REVOKED');
    expect(updateArgs.data.revokedById).toBe('admin-1');
    expect(updateArgs.data.revokedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.revokeReason).toBe('Security concern');

    // Verify history creation
    const historyArgs = (mockPrisma.accreditationHistory.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(historyArgs.data.action).toBe('REVOKED');
    expect(historyArgs.data.oldStatus).toBe('APPROVED');
    expect(historyArgs.data.newStatus).toBe('REVOKED');
    expect(historyArgs.data.notes).toBe('Security concern');
    expect(historyArgs.data.performedById).toBe('admin-1');
  });

  it('sets revokeReason to null when no reason provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildAccreditation({ id: 'acc-1', status: 'APPROVED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditation.update.mockResolvedValue({
      ...existing,
      status: 'REVOKED',
      project: { id: 'project-1', name: 'Test' },
      revokedBy: { id: 'user-1', name: 'Admin', email: 'a@test.com' },
    } as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/revoke', {
      method: 'PATCH',
      body: {},
    });
    await PATCH(req, createMockContext({ id: 'acc-1' }));

    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.revokeReason).toBeNull();
  });

  it('includes revokedBy in response', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    const existing = buildAccreditation({ id: 'acc-1', status: 'APPROVED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = {
      ...existing,
      status: 'REVOKED',
      project: { id: 'project-1', name: 'Test' },
      revokedBy: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/revoke', {
      method: 'PATCH',
      body: { reason: 'Test' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    // Verify include has revokedBy
    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.include.revokedBy).toBeDefined();
  });
});

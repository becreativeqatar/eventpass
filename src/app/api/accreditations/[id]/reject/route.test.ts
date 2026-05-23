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

import { PATCH } from '@/app/api/accreditations/[id]/reject/route';
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

describe('PATCH /api/accreditations/[id]/reject', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/reject', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin/manager role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'VALIDATOR' }));

    const req = createMockRequest('/api/accreditations/acc-1/reject', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/reject', {
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

    const req = createMockRequest('/api/accreditations/acc-1/reject', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot reject');
  });

  it('rejects accreditation with reason and creates history', async () => {
    const session = mockSession({ id: 'admin-1' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING', notes: 'old notes' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = {
      ...existing,
      status: 'REJECTED',
      notes: 'Incomplete documents',
      project: { id: 'project-1', name: 'Test' },
    };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/reject', {
      method: 'PATCH',
      body: { reason: 'Incomplete documents' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: { status: string }; message: string }>(res);

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('REJECTED');
    expect(body.message).toBe('Accreditation rejected');

    // Verify update uses reason as notes
    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.status).toBe('REJECTED');
    expect(updateArgs.data.notes).toBe('Incomplete documents');

    // Verify history
    const historyArgs = (mockPrisma.accreditationHistory.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(historyArgs.data.action).toBe('REJECTED');
    expect(historyArgs.data.oldStatus).toBe('PENDING');
    expect(historyArgs.data.newStatus).toBe('REJECTED');
    expect(historyArgs.data.notes).toBe('Incomplete documents');
    expect(historyArgs.data.performedById).toBe('admin-1');
  });

  it('falls back to existing notes when no reason provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING', notes: 'existing notes' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditation.update.mockResolvedValue({
      ...existing,
      status: 'REJECTED',
      project: { id: 'project-1', name: 'Test' },
    } as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/reject', {
      method: 'PATCH',
      body: {},
    });
    await PATCH(req, createMockContext({ id: 'acc-1' }));

    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.notes).toBe('existing notes');
  });

  it('allows MANAGER to reject', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const existing = buildAccreditation({ status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditation.update.mockResolvedValue({
      ...existing,
      status: 'REJECTED',
      project: { id: 'project-1', name: 'Test' },
    } as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/reject', {
      method: 'PATCH',
      body: { reason: 'Not needed' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
  });
});

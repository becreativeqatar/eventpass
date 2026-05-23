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

import { PATCH } from '@/app/api/accreditations/[id]/return-to-draft/route';
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

describe('PATCH /api/accreditations/[id]/return-to-draft', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns 400 when status is APPROVED', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1', status: 'APPROVED' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot return to draft');
  });

  it('returns 400 when status is DRAFT already', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1', status: 'DRAFT' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(400);
  });

  it('returns 403 when non-creator STAFF tries to return to draft', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'other-user', role: 'STAFF' }));
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ id: 'acc-1', status: 'PENDING', createdById: 'user-1' }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('allows creator to return PENDING to DRAFT', async () => {
    const session = mockSession({ id: 'user-1', role: 'STAFF' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING', createdById: 'user-1' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = { ...existing, status: 'DRAFT', project: { id: 'project-1', name: 'Test' } };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ data: { status: string }; message: string }>(res);

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('DRAFT');
    expect(body.message).toBe('Accreditation returned to draft');
  });

  it('allows ADMIN to return REJECTED to DRAFT and creates history', async () => {
    const session = mockSession({ id: 'admin-1', role: 'ADMIN' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'REJECTED', createdById: 'other-user' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = { ...existing, status: 'DRAFT', project: { id: 'project-1', name: 'Test' } };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: { reason: 'Needs corrections' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);

    const historyArgs = (mockPrisma.accreditationHistory.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(historyArgs.data.action).toBe('RETURNED_TO_DRAFT');
    expect(historyArgs.data.oldStatus).toBe('REJECTED');
    expect(historyArgs.data.newStatus).toBe('DRAFT');
    expect(historyArgs.data.notes).toBe('Needs corrections');
    expect(historyArgs.data.performedById).toBe('admin-1');
  });

  it('allows MANAGER to return to draft', async () => {
    const session = mockSession({ id: 'mgr-1', role: 'MANAGER' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildAccreditation({ id: 'acc-1', status: 'PENDING', createdById: 'other-user' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const updated = { ...existing, status: 'DRAFT', project: { id: 'project-1', name: 'Test' } };
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);
    mockPrisma.accreditationHistory.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1/return-to-draft', {
      method: 'PATCH',
      body: {},
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
  });
});

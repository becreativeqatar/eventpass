import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

import { GET, PATCH, DELETE } from '@/app/api/accreditations/[id]/route';
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

// ---------------------------------------------------------------------------
// GET /api/accreditations/[id]
// ---------------------------------------------------------------------------
describe('GET /api/accreditations/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-999');
    const res = await GET(req, createMockContext({ id: 'acc-999' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Accreditation not found');
  });

  it('returns accreditation with includes', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildAccreditation({
      phases: 'BUMP_IN,LIVE',
      project: { id: 'p-1', name: 'Test Project' },
      createdBy: { id: 'u-1', name: 'Admin', email: 'a@test.com' },
      approvedBy: null,
      revokedBy: null,
      scans: [],
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/accreditations/acc-1');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ accreditation: { phases: string[]; project: unknown } }>(res);

    expect(res.status).toBe(200);
    expect(body.accreditation.phases).toEqual(['BUMP_IN', 'LIVE']);
    expect(body.accreditation.project).toBeDefined();
  });

  it('queries with correct includes (project, scans limited to 10)', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(
      buildAccreditation({ scans: [], project: {}, createdBy: {}, approvedBy: null, revokedBy: null }) as never,
    );

    const req = createMockRequest('/api/accreditations/acc-1');
    await GET(req, createMockContext({ id: 'acc-1' }));

    const callArgs = (mockPrisma.accreditation.findUnique as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.include.scans.take).toBe(10);
    expect(callArgs.include.project).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/accreditations/[id]
// ---------------------------------------------------------------------------
describe('PATCH /api/accreditations/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1', {
      method: 'PATCH',
      body: { firstName: 'Updated' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 for status update by non-admin/manager', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));
    const existing = buildAccreditation({ status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);

    const req = createMockRequest('/api/accreditations/acc-1', {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('allows status update by ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));

    const existing = buildAccreditation({ status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    const updated = buildAccreditation({
      status: 'APPROVED',
      phases: 'LIVE',
      project: { id: 'p-1', name: 'Test' },
      createdBy: { id: 'u-1', name: 'Admin', email: 'a@test.com' },
    });
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/accreditations/acc-1', {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
    const body = await parseJsonResponse<{ accreditation: { status: string } }>(res);
    expect(body.accreditation.status).toBe('APPROVED');
  });

  it('allows status update by MANAGER', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const existing = buildAccreditation({ status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    const updated = buildAccreditation({
      status: 'REJECTED',
      phases: 'BUMP_IN',
      project: { id: 'p-1', name: 'Test' },
      createdBy: { id: 'u-1', name: 'Admin', email: 'a@test.com' },
    });
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/accreditations/acc-1', {
      method: 'PATCH',
      body: { status: 'REJECTED' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
  });

  it('performs full update when body has non-status fields', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildAccreditation({ firstName: 'Old' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    const updated = buildAccreditation({
      firstName: 'Updated',
      phases: 'LIVE',
      project: { id: 'p-1', name: 'Test' },
      createdBy: { id: 'u-1', name: 'Admin', email: 'a@test.com' },
    });
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/accreditations/acc-1', {
      method: 'PATCH',
      body: { firstName: 'Updated', company: 'New Co' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
  });

  it('converts phases array to string on full update', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    const updated = buildAccreditation({
      phases: 'BUMP_IN,BUMP_OUT',
      project: { id: 'p-1', name: 'Test' },
      createdBy: { id: 'u-1', name: 'Admin', email: 'a@test.com' },
    });
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/accreditations/acc-1', {
      method: 'PATCH',
      body: { phases: ['BUMP_IN', 'BUMP_OUT'], firstName: 'Keep' },
    });
    await PATCH(req, createMockContext({ id: 'acc-1' }));

    const updateArgs = (mockPrisma.accreditation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.phases).toBe('BUMP_IN,BUMP_OUT');
  });

  it('transforms phases in response', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(existing as never);
    const updated = buildAccreditation({
      phases: 'BUMP_IN,LIVE,BUMP_OUT',
      project: { id: 'p-1', name: 'Test' },
      createdBy: { id: 'u-1', name: 'Admin', email: 'a@test.com' },
    });
    mockPrisma.accreditation.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/accreditations/acc-1', {
      method: 'PATCH',
      body: { firstName: 'Updated' },
    });
    const res = await PATCH(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ accreditation: { phases: string[] } }>(res);

    expect(body.accreditation.phases).toEqual(['BUMP_IN', 'LIVE', 'BUMP_OUT']);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/accreditations/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/accreditations/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin/manager', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/accreditations/acc-1', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(403);
  });

  it('deletes accreditation and returns success', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditation.delete.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditations/acc-1', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'acc-1' }));
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.accreditation.delete).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
  });
});

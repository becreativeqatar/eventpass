import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { GET, PATCH, DELETE } from '@/app/api/users/[id]/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildUser, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/users/[id]
// ---------------------------------------------------------------------------
describe('GET /api/users/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/users/user-1');
    const res = await GET(req, createMockContext({ id: 'user-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/users/user-1');
    const res = await GET(req, createMockContext({ id: 'user-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 when user does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/users/nonexistent');
    const res = await GET(req, createMockContext({ id: 'nonexistent' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('returns user data with counts on success', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const user = buildUser({
      id: 'user-42',
      _count: { projects: 3, accreditations: 10, scans: 25 },
    });
    mockPrisma.user.findUnique.mockResolvedValue(user as never);

    const req = createMockRequest('/api/users/user-42');
    const res = await GET(req, createMockContext({ id: 'user-42' }));
    const body = await parseJsonResponse<{ data: { id: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('user-42');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/users/[id]
// ---------------------------------------------------------------------------
describe('PATCH /api/users/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/users/user-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    });
    const res = await PATCH(req, createMockContext({ id: 'user-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const req = createMockRequest('/api/users/user-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    });
    const res = await PATCH(req, createMockContext({ id: 'user-1' }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when user does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/users/nonexistent', {
      method: 'PATCH',
      body: { name: 'Updated' },
    });
    const res = await PATCH(req, createMockContext({ id: 'nonexistent' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('blocks self-demotion from ADMIN role', async () => {
    const session = mockSession({ id: 'user-1', role: 'ADMIN' });
    mockGetSession.mockResolvedValue(session);

    const existing = buildUser({ id: 'user-1', role: 'ADMIN' });
    mockPrisma.user.findUnique.mockResolvedValue(existing as never);

    const req = createMockRequest('/api/users/user-1', {
      method: 'PATCH',
      body: { role: 'STAFF' },
    });
    const res = await PATCH(req, createMockContext({ id: 'user-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot change your own admin role');
  });

  it('updates user successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    const existing = buildUser({ id: 'user-2', name: 'Old Name', role: 'STAFF' });
    mockPrisma.user.findUnique.mockResolvedValue(existing as never);

    const updated = buildUser({ id: 'user-2', name: 'New Name', role: 'MANAGER' });
    mockPrisma.user.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/users/user-2', {
      method: 'PATCH',
      body: { name: 'New Name', role: 'MANAGER' },
    });
    const res = await PATCH(req, createMockContext({ id: 'user-2' }));
    const body = await parseJsonResponse<{ data: { id: string; name: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { name: 'New Name', role: 'MANAGER' },
      select: expect.objectContaining({ id: true, name: true }),
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/users/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/users/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/users/user-1', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'user-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/users/user-1', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'user-1' }));

    expect(res.status).toBe(403);
  });

  it('blocks self-deletion', async () => {
    const session = mockSession({ id: 'user-1' });
    mockGetSession.mockResolvedValue(session);

    const req = createMockRequest('/api/users/user-1', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'user-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot delete your own account');
  });

  it('returns 404 when user does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/users/nonexistent', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'nonexistent' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('deletes user successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    const existing = buildUser({ id: 'user-2' });
    mockPrisma.user.findUnique.mockResolvedValue(existing as never);
    mockPrisma.user.delete.mockResolvedValue(existing as never);

    const req = createMockRequest('/api/users/user-2', { method: 'DELETE' });
    const res = await DELETE(req, createMockContext({ id: 'user-2' }));
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } });
  });
});

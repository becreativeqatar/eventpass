import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

import { POST } from '@/app/api/auth/change-password/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { compare, hash } from 'bcryptjs';
import { createMockRequest, mockSession, parseJsonResponse } from '@/test/helpers';
import { buildUser, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockCompare = vi.mocked(compare);
const mockHash = vi.mocked(hash);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('POST /api/auth/change-password', () => {
  const validBody = { currentPassword: 'oldpass123', newPassword: 'newpass456' };

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/auth/change-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when currentPassword is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/auth/change-password', {
      method: 'POST',
      body: { newPassword: 'newpass456' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 when newPassword is too short', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: 'oldpass123', newPassword: '12345' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('at least 6 characters');
  });

  it('returns 404 when user not found or has no password hash', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'user-1' }));
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/auth/change-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('returns 400 when current password is incorrect', async () => {
    const session = mockSession({ id: 'user-1' });
    mockGetSession.mockResolvedValue(session);

    const user = buildUser({ id: 'user-1', passwordHash: '$2b$12$existinghash' });
    mockPrisma.user.findUnique.mockResolvedValue(user as never);
    mockCompare.mockResolvedValue(false as never);

    const req = createMockRequest('/api/auth/change-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe('Current password is incorrect');
  });

  it('successfully changes password', async () => {
    const session = mockSession({ id: 'user-1' });
    mockGetSession.mockResolvedValue(session);

    const user = buildUser({ id: 'user-1', passwordHash: '$2b$12$existinghash' });
    mockPrisma.user.findUnique.mockResolvedValue(user as never);
    mockCompare.mockResolvedValue(true as never);
    mockHash.mockResolvedValue('$2b$12$newhashedpassword' as never);
    mockPrisma.user.update.mockResolvedValue(user as never);

    const req = createMockRequest('/api/auth/change-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCompare).toHaveBeenCalledWith('oldpass123', '$2b$12$existinghash');
    expect(mockHash).toHaveBeenCalledWith('newpass456', 12);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: '$2b$12$newhashedpassword' },
    });
  });

  it('returns 500 when an unexpected error occurs', async () => {
    mockGetSession.mockRejectedValue(new Error('Session error'));

    const req = createMockRequest('/api/auth/change-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe('Something went wrong');
  });
});

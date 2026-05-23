import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/tokens', () => ({
  validatePasswordToken: vi.fn(),
  consumePasswordToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
}));

import { POST } from '@/app/api/auth/set-password/route';
import { prisma } from '@/lib/prisma';
import { validatePasswordToken, consumePasswordToken } from '@/lib/tokens';
import { hash } from 'bcryptjs';
import { createMockRequest, parseJsonResponse } from '@/test/helpers';
import { buildUser, resetCounters } from '@/test/factories';

const mockPrisma = vi.mocked(prisma);
const mockValidateToken = vi.mocked(validatePasswordToken);
const mockConsumeToken = vi.mocked(consumePasswordToken);
const mockHash = vi.mocked(hash);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('POST /api/auth/set-password', () => {
  const validBody = { token: 'valid-token-abc', password: 'newpassword123' };

  it('returns 400 when token is missing', async () => {
    const req = createMockRequest('/api/auth/set-password', {
      method: 'POST',
      body: { password: 'newpassword123' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 when password is too short', async () => {
    const req = createMockRequest('/api/auth/set-password', {
      method: 'POST',
      body: { token: 'some-token', password: '12345' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('at least 6 characters');
  });

  it('returns 400 when token is invalid or expired', async () => {
    mockValidateToken.mockResolvedValue(null);

    const req = createMockRequest('/api/auth/set-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Invalid or expired');
  });

  it('returns 404 when user not found for the token email', async () => {
    mockValidateToken.mockResolvedValue('nonexistent@test.com');
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/auth/set-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('hashes password with bcrypt cost factor 12 and updates user', async () => {
    const user = buildUser({ email: 'user@test.com' });
    mockValidateToken.mockResolvedValue('user@test.com');
    mockPrisma.user.findUnique.mockResolvedValue(user as never);
    mockHash.mockResolvedValue('$2b$12$newhashedpassword' as never);
    mockPrisma.user.update.mockResolvedValue(user as never);
    mockConsumeToken.mockResolvedValue(undefined);

    const req = createMockRequest('/api/auth/set-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockHash).toHaveBeenCalledWith('newpassword123', 12);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { email: 'user@test.com' },
      data: { passwordHash: '$2b$12$newhashedpassword' },
    });
  });

  it('consumes the token after successful password set', async () => {
    const user = buildUser({ email: 'user@test.com' });
    mockValidateToken.mockResolvedValue('user@test.com');
    mockPrisma.user.findUnique.mockResolvedValue(user as never);
    mockHash.mockResolvedValue('$2b$12$hashed' as never);
    mockPrisma.user.update.mockResolvedValue(user as never);
    mockConsumeToken.mockResolvedValue(undefined);

    const req = createMockRequest('/api/auth/set-password', {
      method: 'POST',
      body: validBody,
    });
    await POST(req);

    expect(mockConsumeToken).toHaveBeenCalledWith('valid-token-abc');
  });

  it('returns 500 when an unexpected error occurs', async () => {
    mockValidateToken.mockRejectedValue(new Error('DB down'));

    const req = createMockRequest('/api/auth/set-password', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe('Something went wrong');
  });
});

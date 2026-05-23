import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/tokens', () => ({
  generatePasswordToken: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

import { POST } from '@/app/api/auth/forgot-password/route';
import { prisma } from '@/lib/prisma';
import { generatePasswordToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { createMockRequest, parseJsonResponse } from '@/test/helpers';
import { buildUser, resetCounters } from '@/test/factories';

const mockPrisma = vi.mocked(prisma);
const mockGenerateToken = vi.mocked(generatePasswordToken);
const mockSendResetEmail = vi.mocked(sendPasswordResetEmail);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 even with invalid email format (security)', async () => {
    const req = createMockRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'not-an-email' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 200 when user does not exist (does not reveal email existence)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'nonexistent@test.com' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGenerateToken).not.toHaveBeenCalled();
    expect(mockSendResetEmail).not.toHaveBeenCalled();
  });

  it('generates token and sends reset email when user exists', async () => {
    const user = buildUser({ email: 'exists@test.com', name: 'Jane Doe' });
    mockPrisma.user.findUnique.mockResolvedValue(user as never);
    mockGenerateToken.mockResolvedValue('reset-token-xyz');
    mockSendResetEmail.mockResolvedValue(undefined);

    const req = createMockRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'exists@test.com' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'exists@test.com' },
    });
    expect(mockGenerateToken).toHaveBeenCalledWith('exists@test.com', 1);
    expect(mockSendResetEmail).toHaveBeenCalledWith('exists@test.com', 'Jane Doe', 'reset-token-xyz');
  });

  it('lowercases email before lookup', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'Upper@Test.COM' },
    });
    await POST(req);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'upper@test.com' },
    });
  });

  it('returns 200 even when an internal error occurs (does not leak info)', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'));

    const req = createMockRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'test@test.com' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

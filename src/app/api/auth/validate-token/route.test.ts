import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/tokens', () => ({
  validatePasswordToken: vi.fn(),
}));

import { GET } from '@/app/api/auth/validate-token/route';
import { prisma } from '@/lib/prisma';
import { validatePasswordToken } from '@/lib/tokens';
import { createMockRequest, parseJsonResponse } from '@/test/helpers';
import { buildUser, resetCounters } from '@/test/factories';

const mockPrisma = vi.mocked(prisma);
const mockValidateToken = vi.mocked(validatePasswordToken);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('GET /api/auth/validate-token', () => {
  it('returns 400 when token query param is missing', async () => {
    const req = createMockRequest('/api/auth/validate-token');
    const res = await GET(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe('Token required');
  });

  it('returns 400 when token is invalid or expired', async () => {
    mockValidateToken.mockResolvedValue(null);

    const req = createMockRequest('/api/auth/validate-token', {
      searchParams: { token: 'bad-token' },
    });
    const res = await GET(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid or expired token');
    expect(mockValidateToken).toHaveBeenCalledWith('bad-token');
  });

  it('returns 400 when user no longer exists', async () => {
    mockValidateToken.mockResolvedValue('gone@test.com');
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/auth/validate-token', {
      searchParams: { token: 'valid-token' },
    });
    const res = await GET(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe('User no longer exists');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'gone@test.com' },
    });
  });

  it('returns valid: true when token is valid and user exists', async () => {
    const user = buildUser({ email: 'user@test.com' });
    mockValidateToken.mockResolvedValue('user@test.com');
    mockPrisma.user.findUnique.mockResolvedValue(user as never);

    const req = createMockRequest('/api/auth/validate-token', {
      searchParams: { token: 'good-token' },
    });
    const res = await GET(req);
    const body = await parseJsonResponse<{ valid: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
  });
});

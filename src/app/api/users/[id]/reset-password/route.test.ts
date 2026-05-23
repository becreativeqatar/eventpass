import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/tokens', () => ({
  generatePasswordToken: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

import { POST } from '@/app/api/users/[id]/reset-password/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { generatePasswordToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import {
  createMockRequest,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildUser, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockGenerateToken = vi.mocked(generatePasswordToken);
const mockSendResetEmail = vi.mocked(sendPasswordResetEmail);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('POST /api/users/[id]/reset-password', () => {
  // The route uses { params }: { params: Promise<{ id: string }> } directly,
  // so we pass the context as the second argument with a params Promise.
  const makeContext = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  it('returns 403 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/users/user-1/reset-password', { method: 'POST' });
    const res = await POST(req, makeContext('user-1'));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/users/user-1/reset-password', { method: 'POST' });
    const res = await POST(req, makeContext('user-1'));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 when user does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/users/nonexistent/reset-password', { method: 'POST' });
    const res = await POST(req, makeContext('nonexistent'));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('generates a 24-hour token and sends reset email', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const user = buildUser({ id: 'user-2', email: 'target@test.com', name: 'Target User' });
    mockPrisma.user.findUnique.mockResolvedValue(user as never);
    mockGenerateToken.mockResolvedValue('reset-token-abc');
    mockSendResetEmail.mockResolvedValue(undefined);

    const req = createMockRequest('/api/users/user-2/reset-password', { method: 'POST' });
    const res = await POST(req, makeContext('user-2'));
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGenerateToken).toHaveBeenCalledWith('target@test.com', 24);
    expect(mockSendResetEmail).toHaveBeenCalledWith('target@test.com', 'Target User', 'reset-token-abc');
  });

  it('returns 500 when an unexpected error occurs', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

    const req = createMockRequest('/api/users/user-2/reset-password', { method: 'POST' });
    const res = await POST(req, makeContext('user-2'));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(500);
    expect(body.error).toBe('Something went wrong');
  });
});

import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
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

vi.mock('@/lib/tokens', () => ({
  generatePasswordToken: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendInviteEmail: vi.fn(),
}));

import { GET, POST } from '@/app/api/users/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { generatePasswordToken } from '@/lib/tokens';
import { sendInviteEmail } from '@/lib/email';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildUser, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockGenerateToken = vi.mocked(generatePasswordToken);
const mockSendInvite = vi.mocked(sendInviteEmail);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------------
describe('GET /api/users', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/users');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/users');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns paginated users for ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const user = buildUser({
      _count: { projects: 2, accreditations: 5, scans: 10 },
    });
    mockPrisma.user.findMany.mockResolvedValue([user] as never);
    mockPrisma.user.count.mockResolvedValue(1 as never);

    const req = createMockRequest('/api/users');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{
      data: unknown[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('respects page and pageSize query params', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findMany.mockResolvedValue([] as never);
    mockPrisma.user.count.mockResolvedValue(50 as never);

    const req = createMockRequest('/api/users', {
      searchParams: { p: '3', ps: '10' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ pagination: { page: number; pageSize: number; totalPages: number } }>(res);

    const findArgs = (mockPrisma.user.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.skip).toBe(20); // (3-1)*10
    expect(findArgs.take).toBe(10);
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.pageSize).toBe(10);
    expect(body.pagination.totalPages).toBe(5);
  });

  it('filters by role and search query', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findMany.mockResolvedValue([] as never);
    mockPrisma.user.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/users', {
      searchParams: { role: 'MANAGER', q: 'john' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.user.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.role).toBe('MANAGER');
    expect(whereArg.OR).toBeDefined();
    expect(whereArg.OR).toEqual([
      { name: { contains: 'john' } },
      { email: { contains: 'john' } },
    ]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/users
// ---------------------------------------------------------------------------
describe('POST /api/users', () => {
  const validBody = { name: 'New User', email: 'new@test.com', role: 'STAFF' };

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/users', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const req = createMockRequest('/api/users', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 for invalid body (missing name)', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/users', {
      method: 'POST',
      body: { email: 'new@test.com' },
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existingUser = buildUser({ email: 'new@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue(existingUser as never);

    const req = createMockRequest('/api/users', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(409);
    expect(body.error).toContain('already exists');
  });

  it('creates user with lowercased email and sends invite', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const createdUser = buildUser({
      name: 'New User',
      email: 'new@test.com',
      role: 'STAFF',
    });
    mockPrisma.user.create.mockResolvedValue(createdUser as never);
    mockGenerateToken.mockResolvedValue('invite-token-abc');
    mockSendInvite.mockResolvedValue(undefined);

    const req = createMockRequest('/api/users', {
      method: 'POST',
      body: { name: 'New User', email: 'New@Test.com', role: 'STAFF' },
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { id: string } }>(res);

    expect(res.status).toBe(201);
    expect(body.data).toBeDefined();

    const createArgs = (mockPrisma.user.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.data.email).toBe('new@test.com');
    expect(createArgs.data.name).toBe('New User');
    expect(createArgs.data.role).toBe('STAFF');
  });

  it('generates a 24-hour invite token and sends invite email', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.user.findUnique.mockResolvedValue(null as never);

    const createdUser = buildUser({
      name: 'Jane Doe',
      email: 'jane@test.com',
      role: 'MANAGER',
    });
    mockPrisma.user.create.mockResolvedValue(createdUser as never);
    mockGenerateToken.mockResolvedValue('invite-token-xyz');
    mockSendInvite.mockResolvedValue(undefined);

    const req = createMockRequest('/api/users', {
      method: 'POST',
      body: { name: 'Jane Doe', email: 'jane@test.com', role: 'MANAGER' },
    });
    await POST(req, createMockContext());

    expect(mockGenerateToken).toHaveBeenCalledWith('jane@test.com', 24);
    expect(mockSendInvite).toHaveBeenCalledWith('jane@test.com', 'Jane Doe', 'invite-token-xyz');
  });
});

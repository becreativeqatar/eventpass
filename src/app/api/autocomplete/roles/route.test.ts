import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { GET } from '@/app/api/autocomplete/roles/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/autocomplete/roles
// ---------------------------------------------------------------------------
describe('GET /api/autocomplete/roles', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/autocomplete/roles');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns matching role names', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([
      { role: 'Staff' },
      { role: 'Security' },
    ] as never);

    const req = createMockRequest('/api/autocomplete/roles', {
      searchParams: { q: 'St' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: string[] }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual(['Staff', 'Security']);
  });

  it('filters by projectId when provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/autocomplete/roles', {
      searchParams: { q: 'Test', projectId: 'project-3' },
    });
    await GET(req, createMockContext());

    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.where.projectId).toBe('project-3');
  });

  it('filters null roles out of response', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([
      { role: 'Staff' },
      { role: null },
    ] as never);

    const req = createMockRequest('/api/autocomplete/roles');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: string[] }>(res);

    expect(body.data).toEqual(['Staff']);
  });
});

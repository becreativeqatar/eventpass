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

import { GET } from '@/app/api/autocomplete/companies/route';
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
// GET /api/autocomplete/companies
// ---------------------------------------------------------------------------
describe('GET /api/autocomplete/companies', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/autocomplete/companies');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns matching company names', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([
      { company: 'Acme Corp' },
      { company: 'Acme Labs' },
    ] as never);

    const req = createMockRequest('/api/autocomplete/companies', {
      searchParams: { q: 'Acme' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: string[] }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toEqual(['Acme Corp', 'Acme Labs']);
  });

  it('filters by projectId when provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/autocomplete/companies', {
      searchParams: { q: 'Test', projectId: 'project-5' },
    });
    await GET(req, createMockContext());

    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.where.projectId).toBe('project-5');
  });

  it('filters null companies out of response', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([
      { company: 'Valid Co' },
      { company: null },
    ] as never);

    const req = createMockRequest('/api/autocomplete/companies');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: string[] }>(res);

    expect(body.data).toEqual(['Valid Co']);
  });
});

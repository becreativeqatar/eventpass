import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
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

import { PATCH } from '@/app/api/events/[id]/archive/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildProject, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

function createParamsContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('PATCH /api/events/[id]/archive', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/events/p-1/archive', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-ADMIN roles', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const req = createMockRequest('/api/events/p-1/archive', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('sets event status to ARCHIVED', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const archived = buildProject({ id: 'p-1', status: 'ARCHIVED' });
    mockPrisma.accreditationProject.update.mockResolvedValue(archived as never);

    const req = createMockRequest('/api/events/p-1/archive', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ data: { id: string; status: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('ARCHIVED');

    const updateArgs = (mockPrisma.accreditationProject.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.where.id).toBe('p-1');
    expect(updateArgs.data.status).toBe('ARCHIVED');
  });

  it('allows ADMIN role to archive', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));

    const archived = buildProject({ id: 'p-1', status: 'ARCHIVED' });
    mockPrisma.accreditationProject.update.mockResolvedValue(archived as never);

    const req = createMockRequest('/api/events/p-1/archive', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(200);
  });
});

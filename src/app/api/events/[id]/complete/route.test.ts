import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
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

import { PATCH } from '@/app/api/events/[id]/complete/route';
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

describe('PATCH /api/events/[id]/complete', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/events/p-1/complete', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/events/p-1/complete', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('sets event status to COMPLETED', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildProject({ id: 'p-1', status: 'ACTIVE' });
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(existing as never);

    const completed = buildProject({ id: 'p-1', status: 'COMPLETED' });
    mockPrisma.accreditationProject.update.mockResolvedValue(completed as never);

    const req = createMockRequest('/api/events/p-1/complete', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ data: { id: string; status: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('COMPLETED');

    const updateArgs = (mockPrisma.accreditationProject.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.where.id).toBe('p-1');
    expect(updateArgs.data.status).toBe('COMPLETED');
  });

  it('allows MANAGER role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const existing = buildProject({ id: 'p-1', status: 'ACTIVE' });
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(existing as never);

    const completed = buildProject({ id: 'p-1', status: 'COMPLETED' });
    mockPrisma.accreditationProject.update.mockResolvedValue(completed as never);

    const req = createMockRequest('/api/events/p-1/complete', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(200);
  });
});

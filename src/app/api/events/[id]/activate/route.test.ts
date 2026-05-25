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

import { PATCH } from '@/app/api/events/[id]/activate/route';
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

describe('PATCH /api/events/[id]/activate', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('returns 403 for VALIDATOR role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'VALIDATOR' }));

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('activates a DRAFT event', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildProject({ id: 'p-1', status: 'DRAFT' });
    const activated = buildProject({ id: 'p-1', status: 'ACTIVE' });
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditationProject.update.mockResolvedValue(activated as never);

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ data: { id: string; status: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('p-1');
    expect(body.data.status).toBe('ACTIVE');

    const updateArgs = (mockPrisma.accreditationProject.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.where.id).toBe('p-1');
    expect(updateArgs.data.status).toBe('ACTIVE');
  });

  it('allows MANAGER role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const existing = buildProject({ id: 'p-1', status: 'DRAFT' });
    const activated = buildProject({ id: 'p-1', status: 'ACTIVE' });
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(existing as never);
    mockPrisma.accreditationProject.update.mockResolvedValue(activated as never);

    const req = createMockRequest('/api/events/p-1/activate', { method: 'PATCH', body: {} });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(200);
  });
});

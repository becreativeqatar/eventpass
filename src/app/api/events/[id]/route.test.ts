import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { PATCH, DELETE } from '@/app/api/events/[id]/route';
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

describe('PATCH /api/events/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/events/p-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/events/p-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('returns 404 when event not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findFirst.mockResolvedValue(null as never);

    const req = createMockRequest('/api/events/p-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    });
    const res = await PATCH(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Event not found');
  });

  it('updates event fields', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const existing = buildProject({ id: 'p-1' });
    mockPrisma.accreditationProject.findFirst.mockResolvedValue(existing as never);

    const updated = { ...existing, name: 'Updated Event', venue: 'New Venue' };
    mockPrisma.accreditationProject.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/events/p-1', {
      method: 'PATCH',
      body: { name: 'Updated Event', venue: 'New Venue', accessGroups: ['VIP', 'Staff'] },
    });
    const res = await PATCH(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ data: { name: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.name).toBe('Updated Event');

    const updateArgs = (mockPrisma.accreditationProject.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.data.name).toBe('Updated Event');
    expect(updateArgs.data.venue).toBe('New Venue');
    expect(updateArgs.data.accessGroups).toBe('VIP,Staff');
  });

  it('allows MANAGER to update event', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));

    const existing = buildProject({ id: 'p-1' });
    mockPrisma.accreditationProject.findFirst.mockResolvedValue(existing as never);
    mockPrisma.accreditationProject.update.mockResolvedValue(existing as never);

    const req = createMockRequest('/api/events/p-1', {
      method: 'PATCH',
      body: { name: 'Updated' },
    });
    const res = await PATCH(req, createParamsContext('p-1'));

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/events/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/events/p-1', { method: 'DELETE' });
    const res = await DELETE(req, createParamsContext('p-1'));

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/events/p-1', { method: 'DELETE' });
    const res = await DELETE(req, createParamsContext('p-1'));

    expect(res.status).toBe(403);
  });

  it('returns 404 when event not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findFirst.mockResolvedValue(null as never);

    const req = createMockRequest('/api/events/p-1', { method: 'DELETE' });
    const res = await DELETE(req, createParamsContext('p-1'));

    expect(res.status).toBe(404);
  });

  it('returns 400 when event is not DRAFT', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({ id: 'p-1', status: 'ACTIVE', _count: { accreditations: 0 } });
    mockPrisma.accreditationProject.findFirst.mockResolvedValue(project as never);
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(project as never);

    const req = createMockRequest('/api/events/p-1', { method: 'DELETE' });
    const res = await DELETE(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('draft');
  });

  it('returns 409 when event has accreditations', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({ id: 'p-1', status: 'DRAFT', _count: { accreditations: 3 } });
    mockPrisma.accreditationProject.findFirst.mockResolvedValue(project as never);
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(project as never);

    const req = createMockRequest('/api/events/p-1', { method: 'DELETE' });
    const res = await DELETE(req, createParamsContext('p-1'));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(409);
    expect(body.error).toContain('existing accreditation');
  });
});

import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { GET, POST } from '@/app/api/events/route';
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

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('GET /api/events', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns events list with accessGroups as array', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const projects = [
      buildProject({ id: 'p-1', name: 'Event A', accessGroups: 'VIP,Media,General', _count: { accreditations: 5 } }),
      buildProject({ id: 'p-2', name: 'Event B', accessGroups: 'Staff', _count: { accreditations: 0 } }),
    ];
    mockPrisma.accreditationProject.findMany.mockResolvedValue(projects as never);

    const res = await GET();
    const body = await parseJsonResponse<{ data: Array<{ accessGroups: string[]; name: string }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].accessGroups).toEqual(['VIP', 'Media', 'General']);
    expect(body.data[1].accessGroups).toEqual(['Staff']);
  });

  it('returns empty accessGroups array when field is null', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const projects = [
      buildProject({ id: 'p-1', accessGroups: null, _count: { accreditations: 0 } }),
    ];
    mockPrisma.accreditationProject.findMany.mockResolvedValue(projects as never);

    const res = await GET();
    const body = await parseJsonResponse<{ data: Array<{ accessGroups: string[] }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data[0].accessGroups).toEqual([]);
  });

  it('returns events ordered by createdAt desc', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findMany.mockResolvedValue([] as never);

    await GET();

    const queryArgs = (mockPrisma.accreditationProject.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(queryArgs.orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('POST /api/events', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { name: 'Test Event' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { name: 'Test Event' },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: {},
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('name');
  });

  it('creates event with DRAFT status by default', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    const created = buildProject({ id: 'p-new', name: 'New Event', status: 'DRAFT' });
    mockPrisma.accreditationProject.create.mockResolvedValue(created as never);

    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { name: 'New Event', accessGroups: ['VIP', 'Media'] },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ data: { id: string } }>(res);

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('p-new');

    const createArgs = (mockPrisma.accreditationProject.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.data.accessGroups).toBe('VIP,Media');
    expect(createArgs.data.createdById).toBe('admin-1');
  });

  it('creates event with ACTIVE status when specified', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'admin-1' }));

    const created = buildProject({ id: 'p-new', name: 'Active Event', status: 'ACTIVE' });
    mockPrisma.accreditationProject.create.mockResolvedValue(created as never);

    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { name: 'Active Event', status: 'ACTIVE' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ data: { id: string } }>(res);

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('p-new');

    const createArgs = (mockPrisma.accreditationProject.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.data.status).toBe('ACTIVE');
  });

  it('returns 400 when event code already exists', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(
      buildProject({ code: 'DUP' }) as never,
    );

    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { name: 'Dup Event', code: 'DUP' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('code already exists');
  });
});

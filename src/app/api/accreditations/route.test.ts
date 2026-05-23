import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    accreditationProject: {
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

vi.mock('@/lib/notifications', () => ({
  notifyAdminOfPendingApproval: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from '@/app/api/accreditations/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildAccreditation, buildProject, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/accreditations
// ---------------------------------------------------------------------------
describe('GET /api/accreditations', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns paginated accreditations', async () => {
    const session = mockSession();
    mockGetSession.mockResolvedValue(session);

    const acc = buildAccreditation({
      project: { id: 'project-1', name: 'Test Project' },
      createdBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
    });
    mockPrisma.accreditation.findMany.mockResolvedValue([acc] as never);
    mockPrisma.accreditation.count.mockResolvedValue(1 as never);

    const req = createMockRequest('/api/accreditations');
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

  it('transforms phases string to array in response', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildAccreditation({ phases: 'BUMP_IN,LIVE' });
    mockPrisma.accreditation.findMany.mockResolvedValue([acc] as never);
    mockPrisma.accreditation.count.mockResolvedValue(1 as never);

    const req = createMockRequest('/api/accreditations');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ data: Array<{ phases: string[] }> }>(res);

    expect(body.data[0].phases).toEqual(['BUMP_IN', 'LIVE']);
  });

  it('filters by projectId query param', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditation.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/accreditations', {
      searchParams: { projectId: 'project-42' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.projectId).toBe('project-42');
  });

  it('filters by status query param', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditation.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/accreditations', {
      searchParams: { status: 'APPROVED' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.status).toBe('APPROVED');
  });

  it('builds OR clause for search query', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditation.count.mockResolvedValue(0 as never);

    const req = createMockRequest('/api/accreditations', {
      searchParams: { q: 'john' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.OR).toBeDefined();
    expect(whereArg.OR).toHaveLength(4);
    expect(whereArg.OR[0]).toEqual({ firstName: { contains: 'john' } });
  });

  it('respects page and pageSize params', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);
    mockPrisma.accreditation.count.mockResolvedValue(50 as never);

    const req = createMockRequest('/api/accreditations', {
      searchParams: { p: '3', ps: '10' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ pagination: { page: number; pageSize: number; totalPages: number } }>(res);

    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.skip).toBe(20); // (3-1)*10
    expect(findArgs.take).toBe(10);
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.pageSize).toBe(10);
    expect(body.pagination.totalPages).toBe(5);
  });

  it('returns 400 for invalid query params', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/accreditations', {
      searchParams: { status: 'INVALID_STATUS' },
    });
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/accreditations
// ---------------------------------------------------------------------------
describe('POST /api/accreditations', () => {
  const validBody = {
    projectId: 'project-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    company: 'Test Co',
    role: 'Staff',
    accessGroup: 'General',
    identificationType: 'qid',
    qidNumber: '12345678901',
    qidExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    hasBumpInAccess: true,
    bumpInStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    bumpInEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    hasLiveAccess: false,
    hasBumpOutAccess: false,
    status: 'PENDING',
  };

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: { firstName: 'Only first name' },
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(400);
  });

  it('returns 404 when project does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Project not found');
  });

  it('generates accreditation number starting at ACC-0001', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject();
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(project as never);
    mockPrisma.accreditation.findFirst.mockResolvedValue(null as never);

    const createdAcc = buildAccreditation({
      accreditationNumber: 'ACC-0001',
      status: 'PENDING',
      project: { id: 'project-1', name: 'Test' },
      createdBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
    });
    mockPrisma.accreditation.create.mockResolvedValue(createdAcc as never);

    const req = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validBody,
    });
    await POST(req, createMockContext());

    const createArgs = (mockPrisma.accreditation.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.data.accreditationNumber).toBe('ACC-0001');
  });

  it('increments accreditation number from last existing', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject();
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(project as never);
    mockPrisma.accreditation.findFirst.mockResolvedValue({
      accreditationNumber: 'ACC-0042',
    } as never);

    const createdAcc = buildAccreditation({
      accreditationNumber: 'ACC-0043',
      status: 'PENDING',
      project: { id: 'project-1', name: 'Test' },
      createdBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
    });
    mockPrisma.accreditation.create.mockResolvedValue(createdAcc as never);

    const req = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validBody,
    });
    await POST(req, createMockContext());

    const createArgs = (mockPrisma.accreditation.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.data.accreditationNumber).toBe('ACC-0043');
  });

  it('creates accreditation with session user as createdById', async () => {
    const session = mockSession({ id: 'user-99' });
    mockGetSession.mockResolvedValue(session);
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);
    mockPrisma.accreditation.findFirst.mockResolvedValue(null as never);

    const createdAcc = buildAccreditation({
      status: 'PENDING',
      project: { id: 'project-1', name: 'Test' },
      createdBy: { id: 'user-99', name: 'Admin', email: 'admin@test.com' },
    });
    mockPrisma.accreditation.create.mockResolvedValue(createdAcc as never);

    const req = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(201);
    const createArgs = (mockPrisma.accreditation.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.data.createdById).toBe('user-99');
  });

  it('returns 201 with transformed accreditation on success', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);
    mockPrisma.accreditation.findFirst.mockResolvedValue(null as never);

    const createdAcc = buildAccreditation({
      phases: 'BUMP_IN',
      status: 'PENDING',
      project: { id: 'project-1', name: 'Test' },
      createdBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
    });
    mockPrisma.accreditation.create.mockResolvedValue(createdAcc as never);

    const req = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { phases: string[] } }>(res);

    expect(res.status).toBe(201);
    expect(body.data.phases).toEqual(['BUMP_IN']);
  });
});

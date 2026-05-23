import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

import { GET, POST } from '@/app/api/accreditation/projects/route';
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

// ---------------------------------------------------------------------------
// GET /api/accreditation/projects
// ---------------------------------------------------------------------------
describe('GET /api/accreditation/projects', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns formatted projects with accessGroups as array', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({ accessGroups: 'General,VIP,Media', _count: { accreditations: 5 } });
    mockPrisma.accreditationProject.findMany.mockResolvedValue([project] as never);

    const res = await GET();
    const body = await parseJsonResponse<{
      projects: Array<{ accessGroups: string[]; name: string }>;
    }>(res);

    expect(res.status).toBe(200);
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0].accessGroups).toEqual(['General', 'VIP', 'Media']);
  });
});

// ---------------------------------------------------------------------------
// POST /api/accreditation/projects
// ---------------------------------------------------------------------------
describe('POST /api/accreditation/projects', () => {
  const validBody = {
    name: 'New Event',
    code: 'NE01',
    bumpInStart: '2025-06-01T00:00:00Z',
    bumpInEnd: '2025-06-02T00:00:00Z',
    liveStart: '2025-06-03T00:00:00Z',
    liveEnd: '2025-06-04T00:00:00Z',
    bumpOutStart: '2025-06-05T00:00:00Z',
    bumpOutEnd: '2025-06-06T00:00:00Z',
    accessGroups: ['General', 'VIP'],
  };

  it('returns 400 when required fields are missing', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/accreditation/projects', {
      method: 'POST',
      body: { name: 'Only name' },
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe('Missing required fields');
  });

  it('returns 400 when project code already exists', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);

    const req = createMockRequest('/api/accreditation/projects', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toBe('Project code already exists');
  });

  it('creates project and returns 201', async () => {
    const session = mockSession({ id: 'user-1' });
    mockGetSession.mockResolvedValue(session);
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(null as never);
    const created = buildProject({ name: 'New Event', code: 'NE01' });
    mockPrisma.accreditationProject.create.mockResolvedValue(created as never);

    const req = createMockRequest('/api/accreditation/projects', {
      method: 'POST',
      body: validBody,
    });
    const res = await POST(req);
    const body = await parseJsonResponse<{ project: { name: string } }>(res);

    expect(res.status).toBe(201);
    expect(body.project).toBeDefined();

    const createArgs = (mockPrisma.accreditationProject.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createArgs.data.name).toBe('New Event');
    expect(createArgs.data.code).toBe('NE01');
    expect(createArgs.data.accessGroups).toBe('General,VIP');
    expect(createArgs.data.createdById).toBe('user-1');
  });
});

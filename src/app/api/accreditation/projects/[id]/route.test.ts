import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    accreditation: {
      count: vi.fn(),
    },
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { GET, PUT, DELETE } from '@/app/api/accreditation/projects/[id]/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
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
// GET /api/accreditation/projects/[id]
// ---------------------------------------------------------------------------
describe('GET /api/accreditation/projects/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditation/projects/project-1');
    const ctx = createMockContext({ id: 'project-1' });
    const res = await GET(req, ctx);

    expect(res.status).toBe(401);
  });

  it('returns 404 when project does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditation/projects/missing');
    const res = await GET(req, createMockContext({ id: 'missing' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Project not found');
  });

  it('returns project with accessGroups parsed as array', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({
      accessGroups: 'General,VIP',
      _count: { accreditations: 3 },
    });
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(project as never);

    const req = createMockRequest('/api/accreditation/projects/project-1');
    const res = await GET(req, createMockContext({ id: 'project-1' }));
    const body = await parseJsonResponse<{
      project: { accessGroups: string[] };
    }>(res);

    expect(res.status).toBe(200);
    expect(body.project.accessGroups).toEqual(['General', 'VIP']);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/accreditation/projects/[id]
// ---------------------------------------------------------------------------
describe('PUT /api/accreditation/projects/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditation/projects/project-1', {
      method: 'PUT',
      body: { accessGroups: ['General'] },
    });
    const res = await PUT(req, createMockContext({ id: 'project-1' }));

    expect(res.status).toBe(401);
  });

  it('updates project and returns updated data', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const updated = buildProject({ accessGroups: 'General,VIP,Press' });
    mockPrisma.accreditationProject.update.mockResolvedValue(updated as never);

    const req = createMockRequest('/api/accreditation/projects/project-1', {
      method: 'PUT',
      body: { accessGroups: ['General', 'VIP', 'Press'] },
    });
    const res = await PUT(req, createMockContext({ id: 'project-1' }));
    const body = await parseJsonResponse<{ project: Record<string, unknown> }>(res);

    expect(res.status).toBe(200);
    expect(body.project).toBeDefined();

    const updateArgs = (mockPrisma.accreditationProject.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArgs.where.id).toBe('project-1');
    expect(updateArgs.data.accessGroups).toBe('General,VIP,Press');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/accreditation/projects/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/accreditation/projects/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditation/projects/project-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, createMockContext({ id: 'project-1' }));

    expect(res.status).toBe(401);
  });

  it('returns 400 when project has existing accreditations', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.count.mockResolvedValue(5 as never);

    const req = createMockRequest('/api/accreditation/projects/project-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, createMockContext({ id: 'project-1' }));
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot delete');
  });

  it('deletes project and returns success when no accreditations exist', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.count.mockResolvedValue(0 as never);
    mockPrisma.accreditationProject.delete.mockResolvedValue({} as never);

    const req = createMockRequest('/api/accreditation/projects/project-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, createMockContext({ id: 'project-1' }));
    const body = await parseJsonResponse<{ success: boolean }>(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const deleteArgs = (mockPrisma.accreditationProject.delete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(deleteArgs.where.id).toBe('project-1');
  });
});

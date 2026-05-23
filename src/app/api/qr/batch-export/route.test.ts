import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      findUnique: vi.fn(),
    },
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

const mockFile = vi.fn();
const mockGenerateAsync = vi.fn().mockResolvedValue(new Blob(['fake-zip']));

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-png')),
  },
}));

vi.mock('jszip', () => {
  class MockJSZip {
    file = mockFile;
    generateAsync = mockGenerateAsync;
  }
  return { default: MockJSZip };
});

import { GET } from '@/app/api/qr/batch-export/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildProject, buildAccreditation, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/qr/batch-export
// ---------------------------------------------------------------------------
describe('GET /api/qr/batch-export', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/qr/batch-export', {
      searchParams: { projectId: 'project-1' },
    });
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 400 when projectId is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/qr/batch-export');
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Project ID');
  });

  it('returns 404 when project does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/qr/batch-export', {
      searchParams: { projectId: 'missing' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Project not found');
  });

  it('returns 404 when no approved accreditations found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/qr/batch-export', {
      searchParams: { projectId: 'project-1' },
    });
    const res = await GET(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toContain('No approved accreditations');
  });

  it('generates ZIP file with QR codes', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const project = buildProject({ code: 'EVT1' });
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(project as never);

    const acc = buildAccreditation({
      accreditationNumber: 'ACC-0001',
      firstName: 'John',
      lastName: 'Doe',
      status: 'APPROVED',
      verificationToken: 'token-abc',
    });
    mockPrisma.accreditation.findMany.mockResolvedValue([acc] as never);

    const req = createMockRequest('/api/qr/batch-export', {
      searchParams: { projectId: 'project-1' },
    });
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(res.headers.get('Content-Disposition')).toContain('.zip');
    expect(res.headers.get('Content-Disposition')).toContain('EVT1');

    // Verify file was added to zip
    expect(mockFile).toHaveBeenCalledWith(
      expect.stringContaining('ACC-0001'),
      expect.any(Buffer)
    );
  });

  it('filters by accessGroup when provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);

    const acc = buildAccreditation({ status: 'APPROVED', accessGroup: 'VIP' });
    mockPrisma.accreditation.findMany.mockResolvedValue([acc] as never);

    const req = createMockRequest('/api/qr/batch-export', {
      searchParams: { projectId: 'project-1', accessGroup: 'VIP' },
    });
    await GET(req, createMockContext());

    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.where.accessGroup).toBe('VIP');
  });
});

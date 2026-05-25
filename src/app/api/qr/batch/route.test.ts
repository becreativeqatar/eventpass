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

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fakeQR'),
  },
}));

import { POST } from '@/app/api/qr/batch/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { buildAccreditation, resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// POST /api/qr/batch
// ---------------------------------------------------------------------------
describe('POST /api/qr/batch', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/qr/batch', {
      method: 'POST',
      body: { ids: ['acc-1'] },
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin/non-manager role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/qr/batch', {
      method: 'POST',
      body: { ids: ['acc-1'] },
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(403);
  });

  it('returns 400 when neither ids nor projectId provided', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));

    const req = createMockRequest('/api/qr/batch', {
      method: 'POST',
      body: {},
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('ids');
  });

  it('generates QR codes for specific ids', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    const acc = buildAccreditation({
      id: 'acc-1',
      verificationToken: 'token-1',
      project: { name: 'Test Event' },
    });
    mockPrisma.accreditation.findMany.mockResolvedValue([acc] as never);

    const req = createMockRequest('/api/qr/batch', {
      method: 'POST',
      body: { ids: ['acc-1'] },
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: Array<{ id: string; qrCode: string; verifyUrl: string }> }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].qrCode).toContain('data:image');
    expect(body.data[0].verifyUrl).toContain('token-1');
  });

  it('generates QR codes by projectId', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));
    const acc1 = buildAccreditation({ project: { name: 'Event' } });
    const acc2 = buildAccreditation({ project: { name: 'Event' } });
    mockPrisma.accreditation.findMany.mockResolvedValue([acc1, acc2] as never);

    const req = createMockRequest('/api/qr/batch', {
      method: 'POST',
      body: { projectId: 'project-1' },
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: unknown[] }>(res);

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);

    // Should have queried by projectId
    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.where.projectId).toBe('project-1');
  });

});

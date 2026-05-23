import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from '@/app/api/verify/[token]/route';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  parseJsonResponse,
} from '@/test/helpers';
import { buildAccreditation, buildProject, resetCounters } from '@/test/factories';

const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Build an approved accreditation with project and valid-today phase dates. */
function buildVerifyAccreditation(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return buildAccreditation({
    status: 'APPROVED',
    hasBumpInAccess: true,
    bumpInStart: new Date(now - 2 * 24 * 60 * 60 * 1000),
    bumpInEnd: new Date(now + 2 * 24 * 60 * 60 * 1000),
    hasLiveAccess: true,
    liveStart: new Date(now - 1 * 24 * 60 * 60 * 1000),
    liveEnd: new Date(now + 3 * 24 * 60 * 60 * 1000),
    hasBumpOutAccess: true,
    bumpOutStart: new Date(now - 1 * 24 * 60 * 60 * 1000),
    bumpOutEnd: new Date(now + 5 * 24 * 60 * 60 * 1000),
    project: {
      id: 'project-1',
      name: 'Test Event',
      code: 'TE01',
      bumpInStart: new Date(now - 7 * 24 * 60 * 60 * 1000),
      bumpInEnd: new Date(now + 7 * 24 * 60 * 60 * 1000),
      liveStart: new Date(now - 3 * 24 * 60 * 60 * 1000),
      liveEnd: new Date(now + 3 * 24 * 60 * 60 * 1000),
      bumpOutStart: new Date(now - 1 * 24 * 60 * 60 * 1000),
      bumpOutEnd: new Date(now + 14 * 24 * 60 * 60 * 1000),
    },
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// GET /api/verify/[token]
// ---------------------------------------------------------------------------
describe('GET /api/verify/[token]', () => {
  it('returns 404 for an invalid (non-existent) token', async () => {
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/verify/bad-token');
    const ctx = createMockContext({ token: 'bad-token' });
    const res = await GET(req, ctx);
    const body = await parseJsonResponse<{ errorType: string }>(res);

    expect(res.status).toBe(404);
    expect(body.errorType).toBe('NOT_FOUND');
  });

  it('returns 403 with REVOKED errorType for revoked accreditation', async () => {
    const acc = buildVerifyAccreditation({ status: 'REVOKED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{ errorType: string; name: string }>(res);

    expect(res.status).toBe(403);
    expect(body.errorType).toBe('REVOKED');
    expect(body.name).toContain(acc.firstName as string);
  });

  it('returns 403 with REJECTED errorType for rejected accreditation', async () => {
    const acc = buildVerifyAccreditation({ status: 'REJECTED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{ errorType: string }>(res);

    expect(res.status).toBe(403);
    expect(body.errorType).toBe('REJECTED');
  });

  it('returns 403 with PENDING errorType for pending accreditation', async () => {
    const acc = buildVerifyAccreditation({ status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{ errorType: string }>(res);

    expect(res.status).toBe(403);
    expect(body.errorType).toBe('PENDING');
  });

  it('returns 403 with DENIED for non-standard status (e.g. DRAFT)', async () => {
    const acc = buildVerifyAccreditation({ status: 'DRAFT' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{ errorType: string }>(res);

    expect(res.status).toBe(403);
    expect(body.errorType).toBe('DENIED');
  });

  it('returns 403 NOT_VALID_TODAY when all phase dates are in the future', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T10:00:00Z'));

    const acc = buildVerifyAccreditation({
      hasBumpInAccess: true,
      bumpInStart: new Date('2025-06-01T00:00:00Z'),
      bumpInEnd: new Date('2025-06-02T00:00:00Z'),
      hasLiveAccess: true,
      liveStart: new Date('2025-06-03T00:00:00Z'),
      liveEnd: new Date('2025-06-04T00:00:00Z'),
      hasBumpOutAccess: true,
      bumpOutStart: new Date('2025-06-05T00:00:00Z'),
      bumpOutEnd: new Date('2025-06-06T00:00:00Z'),
      project: {
        id: 'project-1',
        name: 'Test Event',
        code: 'TE01',
        bumpInStart: new Date('2025-06-01T00:00:00Z'),
        bumpInEnd: new Date('2025-06-02T00:00:00Z'),
        liveStart: new Date('2025-06-03T00:00:00Z'),
        liveEnd: new Date('2025-06-04T00:00:00Z'),
        bumpOutStart: new Date('2025-06-05T00:00:00Z'),
        bumpOutEnd: new Date('2025-06-06T00:00:00Z'),
      },
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{ errorType: string }>(res);

    expect(res.status).toBe(403);
    expect(body.errorType).toBe('NOT_VALID_TODAY');
  });

  it('returns 403 NOT_VALID_TODAY when all phase dates are in the past', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    const acc = buildVerifyAccreditation({
      hasBumpInAccess: true,
      bumpInStart: new Date('2025-01-01T00:00:00Z'),
      bumpInEnd: new Date('2025-01-02T00:00:00Z'),
      hasLiveAccess: true,
      liveStart: new Date('2025-01-03T00:00:00Z'),
      liveEnd: new Date('2025-01-04T00:00:00Z'),
      hasBumpOutAccess: true,
      bumpOutStart: new Date('2025-01-05T00:00:00Z'),
      bumpOutEnd: new Date('2025-01-06T00:00:00Z'),
      project: {
        id: 'project-1',
        name: 'Test Event',
        code: 'TE01',
        bumpInStart: new Date('2025-01-01T00:00:00Z'),
        bumpInEnd: new Date('2025-01-02T00:00:00Z'),
        liveStart: new Date('2025-01-03T00:00:00Z'),
        liveEnd: new Date('2025-01-04T00:00:00Z'),
        bumpOutStart: new Date('2025-01-05T00:00:00Z'),
        bumpOutEnd: new Date('2025-01-06T00:00:00Z'),
      },
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{ errorType: string }>(res);

    expect(res.status).toBe(403);
    expect(body.errorType).toBe('NOT_VALID_TODAY');
  });

  it('returns valid=true with accreditation data when approved and within phase dates', async () => {
    const acc = buildVerifyAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{
      valid: boolean;
      status: string;
      data: { firstName: string; project: { name: string; code: string } };
    }>(res);

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.status).toBe('APPROVED');
    expect(body.data.firstName).toBe(acc.firstName);
    expect(body.data.project.name).toBe('Test Event');
    expect(body.data.project.code).toBe('TE01');
  });

  it('includes phases object with start/end ISO strings in valid response', async () => {
    const acc = buildVerifyAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{
      data: {
        phases: {
          bumpIn: { start: string; end: string } | null;
          live: { start: string; end: string } | null;
          bumpOut: { start: string; end: string } | null;
        };
      };
    }>(res);

    expect(body.data.phases.bumpIn).not.toBeNull();
    expect(body.data.phases.bumpIn!.start).toBeDefined();
    expect(body.data.phases.live).not.toBeNull();
    expect(body.data.phases.bumpOut).not.toBeNull();
  });

  it('sets phase to null when accreditation does not have that access', async () => {
    const acc = buildVerifyAccreditation({
      hasBumpInAccess: false,
      hasLiveAccess: true,
      hasBumpOutAccess: false,
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);

    const req = createMockRequest('/api/verify/token-1');
    const res = await GET(req, createMockContext({ token: 'token-1' }));
    const body = await parseJsonResponse<{
      data: {
        phases: {
          bumpIn: unknown;
          live: unknown;
          bumpOut: unknown;
        };
      };
    }>(res);

    expect(body.data.phases.bumpIn).toBeNull();
    expect(body.data.phases.live).not.toBeNull();
    expect(body.data.phases.bumpOut).toBeNull();
  });
});

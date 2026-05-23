import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
      findUnique: vi.fn(),
    },
    accreditationScan: {
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

import { POST } from '@/app/api/scan/route';
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

afterEach(() => {
  vi.useRealTimers();
});

function validScanBody(overrides: Record<string, unknown> = {}) {
  return {
    verificationToken: 'token-1',
    phase: 'LIVE',
    location: 'Main Gate',
    ...overrides,
  };
}

/** Build a full accreditation with project included, as the scan route expects. */
function buildScanAccreditation(overrides: Record<string, unknown> = {}) {
  const now = Date.now();

  return buildAccreditation({
    status: 'APPROVED',
    phases: 'BUMP_IN,LIVE,BUMP_OUT',
    identificationType: 'qid',
    qidNumber: '12345678901',
    qidExpiry: new Date(now + 90 * 24 * 60 * 60 * 1000),
    // Per-accreditation dates that bracket "now" so scans succeed
    hasBumpInAccess: true,
    bumpInStart: new Date(now - 7 * 24 * 60 * 60 * 1000),
    bumpInEnd: new Date(now + 7 * 24 * 60 * 60 * 1000),
    hasLiveAccess: true,
    liveStart: new Date(now - 3 * 24 * 60 * 60 * 1000),
    liveEnd: new Date(now + 3 * 24 * 60 * 60 * 1000),
    hasBumpOutAccess: true,
    bumpOutStart: new Date(now - 1 * 24 * 60 * 60 * 1000),
    bumpOutEnd: new Date(now + 14 * 24 * 60 * 60 * 1000),
    project: {
      id: 'project-1',
      name: 'Test Event',
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
// Auth & validation
// ---------------------------------------------------------------------------
describe('POST /api/scan — auth & validation', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 403 for STAFF role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(403);
  });

  it('allows ADMIN role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    const acc = buildScanAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(200);
  });

  it('allows MANAGER role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'MANAGER' }));
    const acc = buildScanAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(200);
  });

  it('allows VALIDATOR role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'VALIDATOR' }));
    const acc = buildScanAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(200);
  });

  it('returns 400 for missing verificationToken', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: { phase: 'LIVE' },
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid phase', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: { verificationToken: 'tok', phase: 'INVALID' },
    });
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Token lookup
// ---------------------------------------------------------------------------
describe('POST /api/scan — token lookup', () => {
  it('returns DENIED for unknown token', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody({ verificationToken: 'bogus' }),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { allowed: boolean; result: string; message: string } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.allowed).toBe(false);
    expect(body.data.result).toBe('DENIED');
    expect(body.data.message).toContain('Invalid');
  });
});

// ---------------------------------------------------------------------------
// Status checks
// ---------------------------------------------------------------------------
describe('POST /api/scan — status checks', () => {
  it('returns REVOKED for revoked accreditation', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const acc = buildScanAccreditation({ status: 'REVOKED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; allowed: boolean } }>(res);

    expect(body.data.result).toBe('REVOKED');
    expect(body.data.allowed).toBe(false);
  });

  it('returns EXPIRED for expired accreditation', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const acc = buildScanAccreditation({ status: 'EXPIRED' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; allowed: boolean } }>(res);

    expect(body.data.result).toBe('EXPIRED');
    expect(body.data.allowed).toBe(false);
  });

  it('returns DENIED for PENDING accreditation', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    const acc = buildScanAccreditation({ status: 'PENDING' });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; allowed: boolean } }>(res);

    expect(body.data.result).toBe('DENIED');
    expect(body.data.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ID document expiry
// ---------------------------------------------------------------------------
describe('POST /api/scan — ID expiry', () => {
  it('returns ID_EXPIRED for expired QID', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      identificationType: 'qid',
      qidExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; message: string } }>(res);

    expect(body.data.result).toBe('ID_EXPIRED');
    expect(body.data.message).toContain('QID');
  });

  it('returns ID_EXPIRED for expired passport', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      identificationType: 'passport',
      passportNumber: 'AB1234567',
      passportCountry: 'US',
      passportExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired
      hayyaNumber: 'H12345',
      hayyaExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // valid
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; message: string } }>(res);

    expect(body.data.result).toBe('ID_EXPIRED');
    expect(body.data.message).toContain('Passport');
  });

  it('returns ID_EXPIRED for expired Hayya visa', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      identificationType: 'passport',
      passportNumber: 'AB1234567',
      passportCountry: 'US',
      passportExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // valid
      hayyaNumber: 'H12345',
      hayyaExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; message: string } }>(res);

    expect(body.data.result).toBe('ID_EXPIRED');
    expect(body.data.message).toContain('Hayya');
  });
});

// ---------------------------------------------------------------------------
// Phase access
// ---------------------------------------------------------------------------
describe('POST /api/scan — phase checks', () => {
  it('returns WRONG_PHASE when phase not in accreditation phases', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      phases: 'LIVE', // only LIVE access
      hasBumpInAccess: false,
      hasLiveAccess: true,
      hasBumpOutAccess: false,
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody({ phase: 'BUMP_IN' }),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; message: string } }>(res);

    expect(body.data.result).toBe('WRONG_PHASE');
    expect(body.data.message).toContain('BUMP_IN');
  });

  it('returns WRONG_PHASE when per-accreditation phase dates have not started', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      phases: 'BUMP_IN,LIVE,BUMP_OUT',
      hasBumpInAccess: true,
      bumpInStart: new Date('2026-02-01T00:00:00Z'), // future
      bumpInEnd: new Date('2026-02-02T00:00:00Z'),
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody({ phase: 'BUMP_IN' }),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; message: string } }>(res);

    expect(body.data.result).toBe('WRONG_PHASE');
    expect(body.data.message).toContain('not yet valid');
  });

  it('returns WRONG_PHASE when per-accreditation phase dates have expired', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T10:00:00Z'));

    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      phases: 'LIVE',
      hasLiveAccess: true,
      liveStart: new Date('2026-01-01T00:00:00Z'),
      liveEnd: new Date('2026-02-01T00:00:00Z'), // past
      hasBumpInAccess: false,
      hasBumpOutAccess: false,
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody({ phase: 'LIVE' }),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; message: string } }>(res);

    expect(body.data.result).toBe('WRONG_PHASE');
    expect(body.data.message).toContain('expired');
  });

  it('falls back to project dates when no per-accreditation access flags set', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      phases: 'LIVE',
      hasBumpInAccess: false,
      hasLiveAccess: false,
      hasBumpOutAccess: false,
      bumpInStart: null,
      bumpInEnd: null,
      liveStart: null,
      liveEnd: null,
      bumpOutStart: null,
      bumpOutEnd: null,
      project: {
        id: 'project-1',
        name: 'Test',
        bumpInStart: null,
        bumpInEnd: null,
        liveStart: new Date('2026-02-01T00:00:00Z'), // future
        liveEnd: new Date('2026-02-05T00:00:00Z'),
        bumpOutStart: null,
        bumpOutEnd: null,
      },
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody({ phase: 'LIVE' }),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string; message: string } }>(res);

    expect(body.data.result).toBe('WRONG_PHASE');
    expect(body.data.message).toContain('has not started');
  });

  it('returns WRONG_PHASE when project phase has ended (fallback)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T10:00:00Z'));

    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      phases: 'BUMP_OUT',
      hasBumpInAccess: false,
      hasLiveAccess: false,
      hasBumpOutAccess: false,
      bumpInStart: null,
      bumpInEnd: null,
      liveStart: null,
      liveEnd: null,
      bumpOutStart: null,
      bumpOutEnd: null,
      project: {
        id: 'project-1',
        name: 'Test',
        bumpInStart: null,
        bumpInEnd: null,
        liveStart: null,
        liveEnd: null,
        bumpOutStart: new Date('2026-02-01T00:00:00Z'),
        bumpOutEnd: new Date('2026-02-05T00:00:00Z'), // past
      },
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody({ phase: 'BUMP_OUT' }),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { result: string } }>(res);

    expect(body.data.result).toBe('WRONG_PHASE');
  });
});

// ---------------------------------------------------------------------------
// ALLOWED — happy path
// ---------------------------------------------------------------------------
describe('POST /api/scan — allowed', () => {
  it('returns ALLOWED when all checks pass', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { allowed: boolean; result: string; message: string; accreditation: Record<string, unknown> } }>(res);

    expect(body.data.allowed).toBe(true);
    expect(body.data.result).toBe('ALLOWED');
    expect(body.data.message).toBe('Access granted');
    expect(body.data.accreditation).toBeDefined();
    expect(body.data.accreditation.accreditationNumber).toBeDefined();
    expect(body.data.accreditation.phases).toEqual(expect.arrayContaining(['LIVE']));
  });
});

// ---------------------------------------------------------------------------
// Scan recording
// ---------------------------------------------------------------------------
describe('POST /api/scan — scan recording', () => {
  it('records scan with device and IP from headers', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'validator-1' }));

    const acc = buildScanAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody({ location: 'Gate A' }),
      headers: {
        'user-agent': 'TestBrowser/1.0',
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      },
    });
    await POST(req, createMockContext());

    const scanArgs = (mockPrisma.accreditationScan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scanArgs.data.scannedById).toBe('validator-1');
    expect(scanArgs.data.phase).toBe('LIVE');
    expect(scanArgs.data.location).toBe('Gate A');
    expect(scanArgs.data.device).toBe('TestBrowser/1.0');
    expect(scanArgs.data.ipAddress).toBe('10.0.0.1');
  });

  it('uses x-real-ip when x-forwarded-for is absent', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
      headers: {
        'x-real-ip': '192.168.1.100',
      },
    });
    await POST(req, createMockContext());

    const scanArgs = (mockPrisma.accreditationScan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scanArgs.data.ipAddress).toBe('192.168.1.100');
  });
});

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------
describe('POST /api/scan — response shape', () => {
  it('returns QID idInfo for qid identification type', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const qidExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const acc = buildScanAccreditation({
      identificationType: 'qid',
      qidNumber: '12345678901',
      qidExpiry,
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { accreditation: { idInfo: { type: string; number: string; isExpired: boolean } } } }>(res);

    expect(body.data.accreditation.idInfo.type).toBe('QID');
    expect(body.data.accreditation.idInfo.number).toBe('12345678901');
    expect(body.data.accreditation.idInfo.isExpired).toBe(false);
  });

  it('returns Passport idInfo for passport identification type', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation({
      identificationType: 'passport',
      passportNumber: 'AB1234567',
      passportCountry: 'US',
      passportExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      hayyaNumber: 'H12345',
      hayyaExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      // passport type won't trigger QID expiry check
      qidNumber: null,
      qidExpiry: null,
    });
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { accreditation: { idInfo: { type: string; number: string; country: string; isExpired: boolean } } } }>(res);

    expect(body.data.accreditation.idInfo.type).toBe('Passport');
    expect(body.data.accreditation.idInfo.number).toBe('AB1234567');
    expect(body.data.accreditation.idInfo.country).toBe('US');
    expect(body.data.accreditation.idInfo.isExpired).toBe(false);
  });

  it('includes project info in response', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildScanAccreditation();
    mockPrisma.accreditation.findUnique.mockResolvedValue(acc as never);
    mockPrisma.accreditationScan.create.mockResolvedValue({} as never);

    const req = createMockRequest('/api/scan', {
      method: 'POST',
      body: validScanBody(),
    });
    const res = await POST(req, createMockContext());
    const body = await parseJsonResponse<{ data: { accreditation: { project: { id: string; name: string } } } }>(res);

    expect(body.data.accreditation.project.id).toBe('project-1');
    expect(body.data.accreditation.project.name).toBe('Test Event');
  });
});

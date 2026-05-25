import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditation: {
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

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn(),
  },
}));

import { GET } from '@/app/api/accreditations/[id]/qr/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';
import {
  createMockRequest,
  createMockContext,
  mockSession,
  parseJsonResponse,
} from '@/test/helpers';
import { resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockQRCode = vi.mocked(QRCode);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

describe('GET /api/accreditations/[id]/qr', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/accreditations/acc-1/qr');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(401);
    const body = await parseJsonResponse<{ error: string }>(res);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when accreditation not found', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-999/qr');
    const res = await GET(req, createMockContext({ id: 'acc-999' }));

    expect(res.status).toBe(404);
    const body = await parseJsonResponse<{ error: string }>(res);
    expect(body.error).toBe('Not found');
  });

  it('returns 400 when accreditation status is not APPROVED', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue({
      verificationToken: 'token-1',
      status: 'PENDING',
    } as never);

    const req = createMockRequest('/api/accreditations/acc-1/qr');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(400);
    const body = await parseJsonResponse<{ error: string }>(res);
    expect(body.error).toBe('QR code only available for approved accreditations');
  });

  it('returns 400 for REJECTED status', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue({
      verificationToken: 'token-1',
      status: 'REJECTED',
    } as never);

    const req = createMockRequest('/api/accreditations/acc-1/qr');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(400);
  });

  it('returns PNG buffer for approved accreditation', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue({
      verificationToken: 'verify-token-abc',
      status: 'APPROVED',
    } as never);

    const fakeBuffer = Buffer.from('fake-png-data');
    mockQRCode.toBuffer.mockResolvedValue(fakeBuffer as never);

    const req = createMockRequest('/api/accreditations/acc-1/qr');
    const res = await GET(req, createMockContext({ id: 'acc-1' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');

    // Verify QRCode.toBuffer was called with the correct verify URL
    expect(mockQRCode.toBuffer).toHaveBeenCalledWith(
      expect.stringContaining('/verify/verify-token-abc'),
      expect.objectContaining({
        type: 'png',
        width: 400,
        margin: 2,
      }),
    );

    // Verify response body is the PNG buffer
    const responseBuffer = await res.arrayBuffer();
    expect(Buffer.from(responseBuffer)).toEqual(fakeBuffer);
  });

  it('passes correct select fields to prisma', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findUnique.mockResolvedValue(null as never);

    const req = createMockRequest('/api/accreditations/acc-1/qr');
    await GET(req, createMockContext({ id: 'acc-1' }));

    expect(mockPrisma.accreditation.findUnique).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      select: { verificationToken: true, status: true },
    });
  });
});

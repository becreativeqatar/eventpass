import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationScan: {
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

const mockWriteBuffer = vi.fn().mockResolvedValue(Buffer.from('fake-xlsx'));
const mockAddRow = vi.fn();
const mockEachRow = vi.fn();
const mockGetRow = vi.fn().mockReturnValue({ font: {}, fill: {} });

vi.mock('exceljs', () => {
  class MockWorkbook {
    xlsx = { writeBuffer: mockWriteBuffer };
    addWorksheet() {
      return {
        columns: [],
        addRow: mockAddRow,
        getRow: mockGetRow,
        eachRow: mockEachRow,
      };
    }
  }
  return { default: { Workbook: MockWorkbook } };
});

import { GET } from '@/app/api/scans/export/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
  createMockRequest,
  createMockContext,
  mockSession,
} from '@/test/helpers';
import { resetCounters } from '@/test/factories';

const mockGetSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
  resetCounters();
});

// ---------------------------------------------------------------------------
// GET /api/scans/export
// ---------------------------------------------------------------------------
describe('GET /api/scans/export', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/scans/export');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('filters by projectId when provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/scans/export', {
      searchParams: { projectId: 'project-1' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditationScan.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.accreditation).toEqual({ projectId: 'project-1' });
  });

  it('filters by date range', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/scans/export', {
      searchParams: { from: '2025-06-01', to: '2025-06-30' },
    });
    await GET(req, createMockContext());

    const whereArg = (mockPrisma.accreditationScan.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg.scannedAt.gte).toEqual(new Date('2025-06-01'));
    expect(whereArg.scannedAt.lte).toEqual(new Date('2025-06-30'));
  });

  it('returns xlsx content-type with attachment header', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditationScan.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/scans/export');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('.xlsx');
  });
});

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

let capturedColumns: Array<{ header: string; key: string }> = [];
const mockAddRow = vi.fn();
const mockWriteBuffer = vi.fn().mockResolvedValue(Buffer.from('fake-xlsx'));
const mockGetRow = vi.fn().mockReturnValue({ font: {}, fill: {} });

vi.mock('exceljs', () => {
  class MockWorkbook {
    xlsx = { writeBuffer: mockWriteBuffer };
    addWorksheet() {
      const worksheet = {
        _columns: [] as Array<{ header: string; key: string }>,
        get columns() {
          return this._columns;
        },
        set columns(cols: Array<{ header: string; key: string }>) {
          this._columns = cols;
          capturedColumns = cols;
        },
        addRow: mockAddRow,
        getRow: mockGetRow,
      };
      return worksheet;
    }
  }
  return { default: { Workbook: MockWorkbook } };
});

import { GET } from '@/app/api/export/route';
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
  capturedColumns = [];
});

// ---------------------------------------------------------------------------
// GET /api/export
// ---------------------------------------------------------------------------
describe('GET /api/export', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest('/api/export');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
  });

  it('filters by projectId when provided', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/export', {
      searchParams: { projectId: 'project-5' },
    });
    await GET(req, createMockContext());

    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.where).toEqual({ projectId: 'project-5' });
  });

  it('exports all accreditations when no projectId filter', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/export');
    await GET(req, createMockContext());

    const findArgs = (mockPrisma.accreditation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findArgs.where).toEqual({});
  });

  it('returns xlsx content-type with attachment header', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/export');
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('accreditations');
    expect(res.headers.get('Content-Disposition')).toContain('.xlsx');
  });

  it('includes correct columns in the worksheet', async () => {
    mockGetSession.mockResolvedValue(mockSession());
    mockPrisma.accreditation.findMany.mockResolvedValue([] as never);

    const req = createMockRequest('/api/export');
    await GET(req, createMockContext());

    const headers = capturedColumns.map((c) => c.header);
    expect(headers).toContain('Accreditation #');
    expect(headers).toContain('First Name');
    expect(headers).toContain('Last Name');
    expect(headers).toContain('Email');
    expect(headers).toContain('Company');
    expect(headers).toContain('Status');
    expect(headers).toContain('Phases');
    expect(headers).toContain('Project');
  });

  it('adds a row for each accreditation', async () => {
    mockGetSession.mockResolvedValue(mockSession());

    const acc = buildAccreditation({
      phases: 'BUMP_IN,LIVE',
      project: { name: 'Event A' },
      createdBy: { name: 'Admin', email: 'admin@test.com' },
      approvedBy: null,
      approvedAt: null,
      identificationType: 'qid',
      qidExpiry: new Date('2026-12-31'),
      passportExpiry: null,
    });
    mockPrisma.accreditation.findMany.mockResolvedValue([acc] as never);

    const req = createMockRequest('/api/export');
    await GET(req, createMockContext());

    expect(mockAddRow).toHaveBeenCalledTimes(1);
    const rowData = mockAddRow.mock.calls[0][0];
    expect(rowData.firstName).toBe(acc.firstName);
    expect(rowData.project).toBe('Event A');
    expect(rowData.phases).toContain('BUMP_IN');
    expect(rowData.phases).toContain('LIVE');
  });
});

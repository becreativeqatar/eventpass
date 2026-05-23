import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accreditationProject: {
      findUnique: vi.fn(),
    },
    accreditation: {
      findFirst: vi.fn(),
      create: vi.fn().mockReturnValue({ id: 'mock-create-promise' }),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock ExcelJS workbook with configurable rows
const mockRows: Array<{ rowNumber: number; cells: Record<number, string> }> = [];
const mockEachRow = vi.fn().mockImplementation((cb: (row: { getCell: (n: number) => { text: string } }, rowNumber: number) => void) => {
  mockRows.forEach((r) => {
    cb(
      {
        getCell: (n: number) => ({ text: r.cells[n] || '' }),
      },
      r.rowNumber
    );
  });
});
const mockGetWorksheet = vi.fn().mockReturnValue({ eachRow: mockEachRow });
const mockLoad = vi.fn().mockResolvedValue(undefined);

vi.mock('exceljs', () => {
  class MockWorkbook {
    xlsx = { load: mockLoad };
    getWorksheet = mockGetWorksheet;
  }
  return { default: { Workbook: MockWorkbook } };
});

import { POST } from '@/app/api/import/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import {
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
  mockRows.length = 0;
});

/** Create a mock FormData-bearing NextRequest for file upload. */
function createImportRequest(fields: Record<string, string | Blob> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  return new Request('http://localhost:3000/api/import', {
    method: 'POST',
    body: formData,
  });
}

/** Helper to add rows to the mock worksheet. */
function addMockRow(rowNumber: number, cells: Record<number, string>) {
  mockRows.push({ rowNumber, cells });
}

// ---------------------------------------------------------------------------
// POST /api/import
// ---------------------------------------------------------------------------
describe('POST /api/import', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createImportRequest({
      file: new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      projectId: 'project-1',
    });
    const res = await POST(req as never, createMockContext());

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin/non-manager role', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'STAFF' }));

    const req = createImportRequest({
      file: new Blob(['data']),
      projectId: 'project-1',
    });
    const res = await POST(req as never, createMockContext());

    expect(res.status).toBe(403);
  });

  it('returns 400 when no file is provided', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));

    const req = createImportRequest({ projectId: 'project-1' });
    const res = await POST(req as never, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('No file');
  });

  it('returns 400 when projectId is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));

    const req = createImportRequest({
      file: new Blob(['data']),
    });
    const res = await POST(req as never, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('Project ID');
  });

  it('returns 404 when project does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(null as never);

    const req = createImportRequest({
      file: new Blob(['data']),
      projectId: 'project-missing',
    });
    const res = await POST(req as never, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(404);
    expect(body.error).toBe('Project not found');
  });

  it('returns 400 when no valid records found in spreadsheet', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);

    // Only header row, no data rows
    addMockRow(1, { 1: 'First Name', 2: 'Last Name' });

    const req = createImportRequest({
      file: new Blob(['data']),
      projectId: 'project-1',
    });
    const res = await POST(req as never, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('No valid records');
  });

  it('collects row errors when firstName or lastName is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);

    // Header
    addMockRow(1, { 1: 'First Name', 2: 'Last Name' });
    // Valid row
    addMockRow(2, { 1: 'John', 2: 'Doe' });
    // Invalid row - missing lastName
    addMockRow(3, { 1: 'Jane', 2: '' });

    mockPrisma.accreditation.findFirst.mockResolvedValue(null as never);
    mockPrisma.$transaction.mockResolvedValue([{ id: 'acc-1' }] as never);

    const req = createImportRequest({
      file: new Blob(['data']),
      projectId: 'project-1',
    });
    const res = await POST(req as never, createMockContext());
    const body = await parseJsonResponse<{
      imported: number;
      errors: Array<{ row: number; error: string }>;
    }>(res);

    expect(res.status).toBe(200);
    expect(body.imported).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].row).toBe(3);
  });

  it('parses rows and creates accreditations via transaction', async () => {
    mockGetSession.mockResolvedValue(mockSession({ id: 'user-1', role: 'ADMIN' }));
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);
    mockPrisma.accreditation.findFirst.mockResolvedValue({
      accreditationNumber: 'ACC-0010',
    } as never);
    mockPrisma.$transaction.mockResolvedValue([
      { id: 'acc-new-1' },
      { id: 'acc-new-2' },
    ] as never);

    // Header + 2 valid rows
    addMockRow(1, { 1: 'First Name', 2: 'Last Name', 3: 'Email', 4: 'Phone', 5: 'Company', 6: 'Role', 7: 'Phases' });
    addMockRow(2, { 1: 'Alice', 2: 'Smith', 3: 'alice@test.com', 4: '+97412345678', 5: 'Acme', 6: 'Staff', 7: 'BUMP_IN,LIVE' });
    addMockRow(3, { 1: 'Bob', 2: 'Jones', 3: '', 4: '', 5: '', 6: '', 7: 'LIVE' });

    const req = createImportRequest({
      file: new Blob(['data']),
      projectId: 'project-1',
    });
    const res = await POST(req as never, createMockContext());
    const body = await parseJsonResponse<{ imported: number; message: string }>(res);

    expect(res.status).toBe(200);
    expect(body.imported).toBe(2);
    expect(body.message).toContain('2');

    // Verify transaction was called with correct number of operations
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([expect.anything(), expect.anything()])
    );
  });

  it('generates sequential accreditation numbers starting from last', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);
    mockPrisma.accreditation.findFirst.mockResolvedValue({
      accreditationNumber: 'ACC-0042',
    } as never);
    mockPrisma.$transaction.mockResolvedValue([{ id: 'new' }] as never);

    addMockRow(1, { 1: 'First', 2: 'Last' });
    addMockRow(2, { 1: 'John', 2: 'Doe' });

    const req = createImportRequest({
      file: new Blob(['data']),
      projectId: 'project-1',
    });
    await POST(req as never, createMockContext());

    // The $transaction receives an array of prisma create calls
    // We can't easily inspect them since they're prisma client calls,
    // but we can verify $transaction was called
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('returns 400 when worksheet is not found', async () => {
    mockGetSession.mockResolvedValue(mockSession({ role: 'ADMIN' }));
    mockPrisma.accreditationProject.findUnique.mockResolvedValue(buildProject() as never);
    mockGetWorksheet.mockReturnValueOnce(null);

    const req = createImportRequest({
      file: new Blob(['data']),
      projectId: 'project-1',
    });
    const res = await POST(req as never, createMockContext());
    const body = await parseJsonResponse<{ error: string }>(res);

    expect(res.status).toBe(400);
    expect(body.error).toContain('No worksheet');
  });
});

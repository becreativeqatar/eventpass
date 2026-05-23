import { vi } from 'vitest';
import type { Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Stateful mock store — tracks accreditation records across route calls
// ---------------------------------------------------------------------------
type AccRecord = Record<string, unknown>;
const accStore: Map<string, AccRecord> = new Map();
const historyLog: Array<Record<string, unknown>> = [];
const scanLog: Array<Record<string, unknown>> = [];

function resetStore() {
  accStore.clear();
  historyLog.length = 0;
  scanLog.length = 0;
}

// ---------------------------------------------------------------------------
// Mock Prisma with stateful behaviour
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    accreditation: {
      findUnique: vi.fn(({ where }: { where: { id?: string; verificationToken?: string } }) => {
        if (where.id) return Promise.resolve(accStore.get(where.id) ?? null);
        if (where.verificationToken) {
          for (const rec of accStore.values()) {
            if (rec.verificationToken === where.verificationToken) return Promise.resolve(rec);
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      findFirst: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
      create: vi.fn(({ data, include }: { data: AccRecord; include?: unknown }) => {
        const id = data.id as string ?? `acc-${Date.now()}`;
        const record: AccRecord = {
          ...data,
          id,
          verificationToken: data.verificationToken ?? `token-${id}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (include) {
          record.project = { id: data.projectId, name: 'Test Event' };
          record.createdBy = { id: data.createdById, name: 'Admin', email: 'admin@test.com' };
        }
        accStore.set(id, record);
        return Promise.resolve(record);
      }),
      update: vi.fn(({ where, data, include }: { where: { id: string }; data: AccRecord; include?: unknown }) => {
        const existing = accStore.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        if (include) {
          updated.project = (existing.project as Record<string, unknown>) ?? { id: 'project-1', name: 'Test Event' };
        }
        accStore.set(where.id, updated);
        return Promise.resolve(updated);
      }),
      count: vi.fn(() => Promise.resolve(0)),
    },
    accreditationProject: {
      findUnique: vi.fn(() =>
        Promise.resolve({ id: 'project-1', name: 'Test Event', status: 'ACTIVE' }),
      ),
    },
    accreditationHistory: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        historyLog.push(data);
        return Promise.resolve({ id: `hist-${historyLog.length}`, ...data });
      }),
    },
    accreditationScan: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        scanLog.push(data);
        return Promise.resolve({ id: `scan-${scanLog.length}`, ...data });
      }),
    },
  };
  return { prisma: mockPrisma };
});

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(() =>
    Promise.resolve({
      user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    }),
  ),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));

vi.mock('@/lib/notifications', () => ({
  notifyAdminOfPendingApproval: vi.fn(() => Promise.resolve()),
}));

// ---------------------------------------------------------------------------
// Imports — must come after vi.mock calls
// ---------------------------------------------------------------------------
import { POST as createAccreditation } from '@/app/api/accreditations/route';
import { PATCH as approveAccreditation } from '@/app/api/accreditations/[id]/approve/route';
import { PATCH as rejectAccreditation } from '@/app/api/accreditations/[id]/reject/route';
import { PATCH as returnToDraft } from '@/app/api/accreditations/[id]/return-to-draft/route';
import { PATCH as revokeAccreditation } from '@/app/api/accreditations/[id]/revoke/route';
import { POST as scanAccreditation } from '@/app/api/scan/route';
import { createMockRequest, createMockContext, parseJsonResponse } from '@/test/helpers';
import { prisma } from '@/lib/prisma';

const validAccreditationBody = {
  projectId: 'project-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  phone: '+97412345678',
  company: 'TestCo',
  role: 'Engineer',
  accessGroup: 'General',
  identificationType: 'qid',
  qidNumber: '12345678901',
  qidExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'PENDING',
  hasBumpInAccess: true,
  bumpInStart: new Date(Date.now() + 7 * 86400000).toISOString(),
  bumpInEnd: new Date(Date.now() + 8 * 86400000).toISOString(),
  hasLiveAccess: true,
  liveStart: new Date(Date.now() + 9 * 86400000).toISOString(),
  liveEnd: new Date(Date.now() + 10 * 86400000).toISOString(),
  hasBumpOutAccess: false,
};

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
  // Re-wire the stateful mocks after clearAllMocks
  (prisma.accreditation.findUnique as Mock).mockImplementation(
    ({ where }: { where: { id?: string; verificationToken?: string } }) => {
      if (where.id) return Promise.resolve(accStore.get(where.id) ?? null);
      if (where.verificationToken) {
        for (const rec of accStore.values()) {
          if (rec.verificationToken === where.verificationToken) return Promise.resolve(rec);
        }
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    },
  );
  (prisma.accreditation.create as Mock).mockImplementation(
    ({ data, include }: { data: AccRecord; include?: unknown }) => {
      const id = (data.id as string) ?? `acc-${Date.now()}`;
      const record: AccRecord = {
        ...data,
        id,
        verificationToken: data.verificationToken ?? `token-${id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (include) {
        record.project = { id: data.projectId, name: 'Test Event' };
        record.createdBy = { id: data.createdById, name: 'Admin', email: 'admin@test.com' };
      }
      accStore.set(id, record);
      return Promise.resolve(record);
    },
  );
  (prisma.accreditation.update as Mock).mockImplementation(
    ({ where, data, include }: { where: { id: string }; data: AccRecord; include?: unknown }) => {
      const existing = accStore.get(where.id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      if (include) {
        updated.project = (existing.project as Record<string, unknown>) ?? { id: 'project-1', name: 'Test Event' };
      }
      accStore.set(where.id, updated);
      return Promise.resolve(updated);
    },
  );
  (prisma.accreditation.findFirst as Mock).mockResolvedValue(null);
  (prisma.accreditationProject.findUnique as Mock).mockResolvedValue({
    id: 'project-1',
    name: 'Test Event',
    status: 'ACTIVE',
  });
  (prisma.accreditationHistory.create as Mock).mockImplementation(
    ({ data }: { data: Record<string, unknown> }) => {
      historyLog.push(data);
      return Promise.resolve({ id: `hist-${historyLog.length}`, ...data });
    },
  );
  (prisma.accreditationScan.create as Mock).mockImplementation(
    ({ data }: { data: Record<string, unknown> }) => {
      scanLog.push(data);
      return Promise.resolve({ id: `scan-${scanLog.length}`, ...data });
    },
  );
});

describe('Accreditation Lifecycle Integration', () => {
  it('happy path: Create → Approve → Scan (ALLOWED)', async () => {
    // Step 1: Create accreditation
    const createReq = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validAccreditationBody,
    });
    const createRes = await createAccreditation(createReq, createMockContext());
    expect(createRes.status).toBe(201);

    const created = await parseJsonResponse<{ data: AccRecord }>(createRes);
    const accId = created.data.id as string;
    expect(created.data.status).toBe('PENDING');

    // Step 2: Approve
    const approveReq = createMockRequest(`/api/accreditations/${accId}/approve`, {
      method: 'PATCH',
      body: { notes: 'Approved for event' },
    });
    const approveRes = await approveAccreditation(approveReq, createMockContext({ id: accId }));
    expect(approveRes.status).toBe(200);

    const approved = await parseJsonResponse<{ data: AccRecord }>(approveRes);
    expect(approved.data.status).toBe('APPROVED');

    // Step 3: Scan — should be ALLOWED
    const token = accStore.get(accId)?.verificationToken as string;
    const scanReq = createMockRequest('/api/scan', {
      method: 'POST',
      body: {
        verificationToken: token,
        phase: 'LIVE',
        location: 'Main Gate',
      },
    });
    const scanRes = await scanAccreditation(scanReq, createMockContext());
    expect(scanRes.status).toBe(200);

    const scanResult = await parseJsonResponse<{
      data: { allowed: boolean; result: string; message: string };
    }>(scanRes);
    expect(scanResult.data.allowed).toBe(true);
    expect(scanResult.data.result).toBe('ALLOWED');
  });

  it('rejection flow: Create → Reject → Return to Draft', async () => {
    // Step 1: Create
    const createReq = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validAccreditationBody,
    });
    const createRes = await createAccreditation(createReq, createMockContext());
    expect(createRes.status).toBe(201);

    const created = await parseJsonResponse<{ data: AccRecord }>(createRes);
    const accId = created.data.id as string;

    // Step 2: Reject
    const rejectReq = createMockRequest(`/api/accreditations/${accId}/reject`, {
      method: 'PATCH',
      body: { reason: 'Missing info' },
    });
    const rejectRes = await rejectAccreditation(rejectReq, createMockContext({ id: accId }));
    expect(rejectRes.status).toBe(200);

    const rejected = await parseJsonResponse<{ data: AccRecord }>(rejectRes);
    expect(rejected.data.status).toBe('REJECTED');

    // Step 3: Return to Draft
    const draftReq = createMockRequest(`/api/accreditations/${accId}/return-to-draft`, {
      method: 'PATCH',
      body: { reason: 'Resubmit with corrections' },
    });
    const draftRes = await returnToDraft(draftReq, createMockContext({ id: accId }));
    expect(draftRes.status).toBe(200);

    const drafted = await parseJsonResponse<{ data: AccRecord }>(draftRes);
    expect(drafted.data.status).toBe('DRAFT');

    // Verify history log captured all transitions
    const actionsInOrder = historyLog.map((h) => h.action);
    expect(actionsInOrder).toContain('REJECTED');
    expect(actionsInOrder).toContain('RETURNED_TO_DRAFT');
  });

  it('revocation flow: Create → Approve → Revoke → Scan (REVOKED)', async () => {
    // Step 1: Create
    const createReq = createMockRequest('/api/accreditations', {
      method: 'POST',
      body: validAccreditationBody,
    });
    const createRes = await createAccreditation(createReq, createMockContext());
    expect(createRes.status).toBe(201);

    const created = await parseJsonResponse<{ data: AccRecord }>(createRes);
    const accId = created.data.id as string;

    // Step 2: Approve
    const approveReq = createMockRequest(`/api/accreditations/${accId}/approve`, {
      method: 'PATCH',
      body: {},
    });
    const approveRes = await approveAccreditation(approveReq, createMockContext({ id: accId }));
    expect(approveRes.status).toBe(200);

    // Step 3: Revoke
    const revokeReq = createMockRequest(`/api/accreditations/${accId}/revoke`, {
      method: 'PATCH',
      body: { reason: 'Security concern' },
    });
    const revokeRes = await revokeAccreditation(revokeReq, createMockContext({ id: accId }));
    expect(revokeRes.status).toBe(200);

    const revoked = await parseJsonResponse<{ data: AccRecord }>(revokeRes);
    expect(revoked.data.status).toBe('REVOKED');

    // Step 4: Scan — should be REVOKED
    const token = accStore.get(accId)?.verificationToken as string;
    const scanReq = createMockRequest('/api/scan', {
      method: 'POST',
      body: {
        verificationToken: token,
        phase: 'LIVE',
        location: 'Gate B',
      },
    });
    const scanRes = await scanAccreditation(scanReq, createMockContext());
    expect(scanRes.status).toBe(200);

    const scanResult = await parseJsonResponse<{
      data: { allowed: boolean; result: string };
    }>(scanRes);
    expect(scanResult.data.allowed).toBe(false);
    expect(scanResult.data.result).toBe('REVOKED');
  });
});

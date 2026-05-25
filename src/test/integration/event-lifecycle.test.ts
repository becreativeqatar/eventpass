import { vi } from 'vitest';
import type { Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Stateful mock store — tracks event/project records across route calls
// ---------------------------------------------------------------------------
type ProjectRecord = Record<string, unknown>;
const projectStore: Map<string, ProjectRecord> = new Map();

function resetStore() {
  projectStore.clear();
}

// ---------------------------------------------------------------------------
// Mock Prisma with stateful behaviour
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    accreditationProject: {
      findUnique: vi.fn(({ where }: { where: { id?: string; code?: string } }) => {
        if (where.id) return Promise.resolve(projectStore.get(where.id) ?? null);
        if (where.code) {
          for (const rec of projectStore.values()) {
            if (rec.code === where.code) return Promise.resolve(rec);
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      findMany: vi.fn(() => Promise.resolve([...projectStore.values()])),
      create: vi.fn(({ data }: { data: ProjectRecord }) => {
        const id = (data.id as string) ?? `project-${Date.now()}`;
        const record: ProjectRecord = {
          ...data,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { accreditations: 0 },
        };
        projectStore.set(id, record);
        return Promise.resolve(record);
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: ProjectRecord }) => {
        const existing = projectStore.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        projectStore.set(where.id, updated);
        return Promise.resolve(updated);
      }),
      updateMany: vi.fn(({ where, data }: { where: { status?: string }; data: { status: string } }) => {
        let count = 0;
        for (const [id, rec] of projectStore.entries()) {
          if (where.status && rec.status === where.status) {
            projectStore.set(id, { ...rec, status: data.status, updatedAt: new Date() });
            count++;
          }
        }
        return Promise.resolve({ count });
      }),
      count: vi.fn(() => Promise.resolve(projectStore.size)),
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

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { POST as createEvent } from '@/app/api/events/route';
import { PATCH as activateEvent } from '@/app/api/events/[id]/activate/route';
import { createMockRequest, parseJsonResponse } from '@/test/helpers';
import { prisma } from '@/lib/prisma';

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();

  // Re-wire stateful mocks after clearAllMocks
  (prisma.accreditationProject.findUnique as Mock).mockImplementation(
    ({ where }: { where: { id?: string; code?: string } }) => {
      if (where.id) return Promise.resolve(projectStore.get(where.id) ?? null);
      if (where.code) {
        for (const rec of projectStore.values()) {
          if (rec.code === where.code) return Promise.resolve(rec);
        }
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    },
  );
  (prisma.accreditationProject.create as Mock).mockImplementation(
    ({ data }: { data: ProjectRecord }) => {
      const id = (data.id as string) ?? `project-${Date.now()}`;
      const record: ProjectRecord = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { accreditations: 0 },
      };
      projectStore.set(id, record);
      return Promise.resolve(record);
    },
  );
  (prisma.accreditationProject.update as Mock).mockImplementation(
    ({ where, data }: { where: { id: string }; data: ProjectRecord }) => {
      const existing = projectStore.get(where.id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      projectStore.set(where.id, updated);
      return Promise.resolve(updated);
    },
  );
  (prisma.accreditationProject.updateMany as Mock).mockImplementation(
    ({ where, data }: { where: { status?: string }; data: { status: string } }) => {
      let count = 0;
      for (const [id, rec] of projectStore.entries()) {
        if (where.status && rec.status === where.status) {
          projectStore.set(id, { ...rec, status: data.status, updatedAt: new Date() });
          count++;
        }
      }
      return Promise.resolve({ count });
    },
  );
});

describe('Event Lifecycle Integration', () => {
  it('creates a new active event successfully', async () => {
    // Seed an existing ACTIVE event
    projectStore.set('existing-1', {
      id: 'existing-1',
      name: 'Old Active Event',
      code: 'OLD',
      status: 'ACTIVE',
      description: null,
      venue: null,
      eventDate: null,
      accessGroups: 'General',
      bumpInStart: null,
      bumpInEnd: null,
      liveStart: null,
      liveEnd: null,
      bumpOutStart: null,
      bumpOutEnd: null,
      createdById: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create a new event with ACTIVE status
    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: {
        name: 'New Active Event',
        code: 'NEW',
        status: 'ACTIVE',
        accessGroups: ['General'],
      },
    });
    const res = await createEvent(req);
    expect(res.status).toBe(201);

    const body = await parseJsonResponse<{ data: ProjectRecord }>(res);
    expect(body.data.status).toBe('ACTIVE');

    // The new event should be ACTIVE
    expect(body.data.name).toBe('New Active Event');
  });

  it('activate endpoint transitions DRAFT → ACTIVE', async () => {
    // Seed a DRAFT event and an existing ACTIVE event
    projectStore.set('draft-1', {
      id: 'draft-1',
      name: 'Draft Event',
      code: 'DRAFT',
      status: 'DRAFT',
      description: null,
      venue: null,
      eventDate: null,
      accessGroups: 'General',
      createdById: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    projectStore.set('active-1', {
      id: 'active-1',
      name: 'Currently Active',
      code: 'ACT',
      status: 'ACTIVE',
      description: null,
      venue: null,
      eventDate: null,
      accessGroups: 'General',
      createdById: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Activate the draft event
    const req = createMockRequest('/api/events/draft-1/activate', { method: 'PATCH' });
    const res = await activateEvent(req, {
      params: Promise.resolve({ id: 'draft-1' }),
    });
    expect(res.status).toBe(200);

    const body = await parseJsonResponse<{ data: ProjectRecord }>(res);
    expect(body.data.status).toBe('ACTIVE');
    expect(body.data.id).toBe('draft-1');

    // The draft event is now ACTIVE in the store
    const nowActive = projectStore.get('draft-1');
    expect(nowActive?.status).toBe('ACTIVE');
  });
});
